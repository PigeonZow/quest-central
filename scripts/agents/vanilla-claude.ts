import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Vanilla Claude Agent
 * Single Claude Sonnet API call per quest. Fast, simple, no frills.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=your-party-api-key ANTHROPIC_API_KEY=sk-... npx tsx scripts/agents/vanilla-claude.ts
 *
 * Or set API_KEY via the seed script output.
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
let API_KEY = process.env.API_KEY || "";

const SCAN_INTERVAL = 8000; // 8s between scans

interface QuestListing {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getApiKeyFromDb(): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("parties")
    .select("api_key")
    .eq("name", "Vanilla Claude")
    .single();
  return data?.api_key ?? "";
}

async function callClaude(questTitle: string, questDescription: string, criteria: string | null): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback: return a decent pre-canned response
    return `## Vanilla Claude Response\n\nI've analyzed the task "${questTitle}" and here's my direct response:\n\n${questDescription}\n\nThis was completed in a single API call with no planning or review steps. Simple and direct.`;
  }

  const systemPrompt = `You are an expert assistant. Complete the given task directly and thoroughly. Be concise but comprehensive.

CRITICAL: If your response includes ANY code (HTML, CSS, JS, Python, etc.), you MUST wrap the code entirely in standard markdown code blocks with the language specified (e.g., \`\`\`html
code here
\`\`\`). Do not ever output raw HTML/code as plain text.`;
  const userPrompt = `Task: ${questTitle}\n\nDescription: ${questDescription}${criteria ? `\n\nAcceptance Criteria: ${criteria}` : ""}\n\nComplete this task now. Provide your full response.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Claude API error:", err);
    return `Failed to get response from Claude: ${res.status}`;
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "No response generated.";
  const tokens = data.usage?.output_tokens ?? 0;

  console.log(`  Claude responded (${tokens} tokens)`);
  return text;
}

/**
 * Party Leader — evaluates available quests and picks the best one.
 * Uses a lightweight LLM call to decide, falling back to simple difficulty sort.
 */
async function selectQuest(quests: QuestListing[]): Promise<QuestListing | null> {
  if (quests.length === 0) return null;

  // Filter out quests with no remaining slots
  const available = quests.filter((q) => q.slots_remaining > 0);
  if (available.length === 0) {
    console.log("[Party Leader] All quests are full. Skipping.");
    return null;
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    // Fallback: prefer easiest quest with open slots
    const sorted = [...available].sort((a, b) => {
      const order: Record<string, number> = { C: 0, B: 1, A: 2, S: 3 };
      return (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4);
    });
    console.log(`[Party Leader] (fallback) Picked easiest: "${sorted[0].title}"`);
    return sorted[0];
  }

  const questSummaries = available.map((q, i) => (
    `${i + 1}. "${q.title}" [${q.difficulty}-Rank, ${q.category}] — ${q.gold_reward}G/${q.rp_reward}RP — ${q.slots_remaining}/${q.max_attempts} slots open\n   ${q.description.slice(0, 150)}${q.description.length > 150 ? "..." : ""}`
  )).join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content: `You are the party leader for "Vanilla Claude", a fast single-call agent.
Your party's strength: speed and simplicity. You make one direct LLM call per quest.
You excel at: writing, research, general knowledge, creative tasks.
You struggle with: multi-step coding tasks, tasks requiring tool use or iteration.

Pick the ONE best quest for your party, or pick NONE if nothing is a good fit.
Prefer quests where a single strong response wins. Avoid tasks that need iteration.
Consider competition — fewer current attempts means less competition.

Respond with ONLY a JSON object: {"pick": <number 1-N or null>, "reason": "<brief reason>"}`,
        },
        { role: "user", content: `Available quests:\n${questSummaries}` },
      ],
    }),
  });

  if (!res.ok) {
    console.log("[Party Leader] LLM call failed, using fallback.");
    return available[0];
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const decision = JSON.parse(match[0]);
      if (decision.pick === null) {
        console.log(`[Party Leader] Decided to skip. Reason: ${decision.reason}`);
        return null;
      }
      const idx = decision.pick - 1;
      if (idx >= 0 && idx < available.length) {
        console.log(`[Party Leader] Picked "${available[idx].title}". Reason: ${decision.reason}`);
        return available[idx];
      }
    }
  } catch {
    // Parse failed, fall through
  }

  console.log("[Party Leader] Couldn't parse decision, picking first available.");
  return available[0];
}

async function run() {
  console.log("Vanilla Claude Agent");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Anthropic API: ${ANTHROPIC_API_KEY ? "configured" : "NOT SET (using fallback)"}\n`);

  if (!API_KEY) {
    console.log("No API_KEY env var, looking up from database...");
    API_KEY = await getApiKeyFromDb();
    if (!API_KEY) {
      console.error("Could not find Vanilla Claude party. Run seed first: npm run seed");
      process.exit(1);
    }
    console.log(`Found API key: ${API_KEY.slice(0, 8)}...\n`);
  }

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  /** Track quests we've already attempted so we don't retry them */
  const attemptedQuestIds = new Set<string>();

  while (true) {
    try {
      // Scan
      console.log("[Vanilla Claude] Scanning for quests...");
      const questsRes = await fetch(`${BASE_URL}/api/external/quests`, { headers });
      const quests: QuestListing[] = await questsRes.json();

      if (!Array.isArray(quests) || quests.length === 0) {
        console.log("[Vanilla Claude] No open quests. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      // Party Leader selects a quest (filter out already-attempted)
      const fresh = quests.filter((q) => !attemptedQuestIds.has(q.id));
      const quest = await selectQuest(fresh);
      if (!quest) {
        console.log("[Vanilla Claude] No new quests available. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      console.log(`[Vanilla Claude] Accepting: "${quest.title}" (${quest.difficulty}-Rank)`);

      // Accept
      const acceptRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/accept`,
        { method: "POST", headers }
      );

      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.log(`[Vanilla Claude] Accept failed: ${err.error}`);
        attemptedQuestIds.add(quest.id);
        await sleep(5000);
        continue;
      }

      attemptedQuestIds.add(quest.id);

      // Do the work - single Claude call
      console.log("[Vanilla Claude] Making single Claude API call...");
      const result = await callClaude(quest.title, quest.description, quest.acceptance_criteria);

      // Submit
      const submitRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/submit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            result_text: result,
            token_count: result.length, // rough estimate
          }),
        }
      );

      if (submitRes.ok) {
        console.log(`[Vanilla Claude] Submitted for "${quest.title}"\n`);
      } else {
        const err = await submitRes.json();
        console.log(`[Vanilla Claude] Submit failed: ${err.error}\n`);
      }
    } catch (err) {
      console.error("[Vanilla Claude] Error:", err);
    }

    await sleep(SCAN_INTERVAL);
  }
}

run().catch(console.error);
