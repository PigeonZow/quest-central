/**
 * QuestRunner — handles the scan → accept → submit loop.
 *
 * You provide two functions:
 *   solve_quest(quest)  — your agent logic (required)
 *   select_quest(quests) — pick which quest to take (optional, defaults to first available)
 *
 * The runner handles polling, auth, error recovery, and submission.
 */

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  gold_reward: number;
  rp_reward: number;
  max_attempts: number;
  current_attempts: number;
  slots_remaining: number;
  acceptance_criteria: string | null;
}

export interface QuestResult {
  result_text: string;
  token_count?: number;
}

export interface QuestRunnerConfig {
  apiKey?: string;
  /** Look up API key from DB by party name (used when apiKey is not provided) */
  partyName?: string;
  baseUrl?: string;
  scanInterval?: number;
  name?: string;

  /** Your agent logic. Given a quest, return the result. This is your black box. */
  solve_quest: (quest: Quest) => Promise<QuestResult>;

  /** Optional: custom quest selection logic (the "party leader"). Defaults to first available. */
  select_quest?: (quests: Quest[]) => Promise<Quest | null>;

  /** Use the party's leader_prompt (from server) for LLM-powered quest selection. Default: true. */
  useLeaderPrompt?: boolean;
}

export class QuestRunner {
  private apiKey: string;
  private partyName?: string;
  private baseUrl: string;
  private scanInterval: number;
  private name: string;
  private skipQuestIds = new Set<string>();
  private useLeaderPrompt: boolean;
  private hasCustomSelect: boolean;
  private leaderPrompt: string | null = null;

  solve_quest: (quest: Quest) => Promise<QuestResult>;
  select_quest: (quests: Quest[]) => Promise<Quest | null>;

  constructor(config: QuestRunnerConfig) {
    this.apiKey = config.apiKey ?? "";
    this.partyName = config.partyName;
    this.baseUrl = (config.baseUrl || "http://localhost:3000").replace(/\/$/, "");
    this.scanInterval = config.scanInterval ?? 10_000;
    this.name = config.name ?? "Agent";
    this.solve_quest = config.solve_quest;
    this.hasCustomSelect = !!config.select_quest;
    this.useLeaderPrompt = config.useLeaderPrompt ?? true;
    this.select_quest = config.select_quest ?? this.defaultSelect;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private log(msg: string) {
    console.log(`[${this.name}] ${msg}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async defaultSelect(quests: Quest[]): Promise<Quest | null> {
    const available = quests.filter((q) => q.slots_remaining > 0);
    return available[0] ?? null;
  }

  /** Fetch the party's leader_prompt from the status API. */
  private async fetchLeaderPrompt(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/external/party/status`, {
        headers: this.headers,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.leader_prompt) {
        this.leaderPrompt = data.leader_prompt;
        this.log(`Leader strategy loaded: "${this.leaderPrompt}"`);
      }
    } catch {
      // Non-fatal — fall back to default selection
    }
  }

  /** Use LLM to pick the best quest based on the leader prompt. */
  private async leaderSelect(quests: Quest[]): Promise<Quest | null> {
    const available = quests.filter((q) => q.slots_remaining > 0);
    if (available.length === 0) return null;
    if (available.length === 1) return available[0];

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      this.log("No ANTHROPIC_API_KEY — falling back to default selection.");
      return available[0];
    }

    const questList = available
      .map(
        (q, i) =>
          `${i + 1}. [${q.difficulty}-Rank] "${q.title}" (${q.category}) — ${q.gold_reward}G, ${q.rp_reward} RP`
      )
      .join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 64,
          system:
            "You are a party leader selecting quests for your team. Given the strategy and available quests, respond with ONLY the number of the best quest to accept. Just the number, nothing else.",
          messages: [
            {
              role: "user",
              content: `Party strategy: ${this.leaderPrompt}\n\nAvailable quests:\n${questList}\n\nWhich quest number should we accept?`,
            },
          ],
        }),
      });

      if (!res.ok) {
        this.log(`Leader LLM call failed (${res.status}) — falling back to default.`);
        return available[0];
      }

      const data = await res.json();
      const text = (data.content?.[0]?.text ?? "").trim();
      const pick = parseInt(text, 10);

      if (pick >= 1 && pick <= available.length) {
        this.log(`Leader picked quest #${pick}: "${available[pick - 1].title}"`);
        return available[pick - 1];
      }

      this.log(`Leader returned "${text}" — could not parse, falling back to default.`);
      return available[0];
    } catch (err) {
      this.log(`Leader selection error: ${err} — falling back to default.`);
      return available[0];
    }
  }

  private async resolveApiKey() {
    if (this.apiKey) return;

    if (this.partyName) {
      this.log(`No API key provided, looking up "${this.partyName}" from database...`);
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data } = await supabase
          .from("parties")
          .select("api_key")
          .eq("name", this.partyName)
          .single();
        if (data?.api_key) {
          this.apiKey = data.api_key;
          this.log(`Found API key: ${this.apiKey.slice(0, 8)}...`);
          return;
        }
      } catch {
        // fall through
      }
    }

    this.log("ERROR: No API key. Set API_KEY env var or provide partyName for DB lookup.");
    process.exit(1);
  }

  async start() {
    await this.resolveApiKey();

    // Fetch leader prompt and wire up LLM-powered selection if applicable
    if (this.useLeaderPrompt && !this.hasCustomSelect) {
      await this.fetchLeaderPrompt();
      if (this.leaderPrompt) {
        this.select_quest = this.leaderSelect.bind(this);
      }
    }

    this.log("Starting...");
    this.log(`Server: ${this.baseUrl}`);
    console.log();

    while (true) {
      try {
        await this.tick();
      } catch (err) {
        this.log(`Error: ${err}`);
      }
      await this.sleep(this.scanInterval);
    }
  }

  private async tick() {
    // 1. Scan for quests
    this.log("Scanning for quests...");
    const res = await fetch(`${this.baseUrl}/api/external/quests`, {
      headers: this.headers,
    });

    if (!res.ok) {
      this.log(`Failed to fetch quests: ${res.status}`);
      return;
    }

    const allQuests: Quest[] = await res.json();
    const quests = Array.isArray(allQuests)
      ? allQuests.filter((q) => !this.skipQuestIds.has(q.id))
      : [];

    if (quests.length === 0) {
      this.log("No eligible quests. Waiting...");
      return;
    }

    // 2. Select a quest
    const quest = await this.select_quest(quests);
    if (!quest) {
      this.log("Passed on all quests. Waiting...");
      return;
    }

    // 3. Accept
    this.log(`Accepting: "${quest.title}" (${quest.difficulty}-Rank)`);
    const acceptRes = await fetch(
      `${this.baseUrl}/api/external/quests/${quest.id}/accept`,
      { method: "POST", headers: this.headers }
    );

    if (!acceptRes.ok) {
      const err = await acceptRes.json().catch(() => ({}));
      this.log(`Accept failed: ${(err as { error?: string }).error ?? acceptRes.status}`);
      this.skipQuestIds.add(quest.id);
      return;
    }

    // 4. Solve — the user's black box
    this.log("Solving quest...");
    const result = await this.solve_quest(quest);

    // 5. Submit
    const submitRes = await fetch(
      `${this.baseUrl}/api/external/quests/${quest.id}/submit`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          result_text: result.result_text,
          token_count: result.token_count,
        }),
      }
    );

    if (submitRes.ok) {
      this.log(`Submitted for "${quest.title}"\n`);
    } else {
      const err = await submitRes.json().catch(() => ({}));
      this.log(`Submit failed: ${(err as { error?: string }).error ?? submitRes.status}\n`);
    }
  }
}
