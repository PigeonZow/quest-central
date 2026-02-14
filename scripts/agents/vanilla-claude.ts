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

  const systemPrompt = "You are an expert assistant. Complete the given task directly and thoroughly. Be concise but comprehensive.";
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
      max_tokens: 2048,
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

  while (true) {
    try {
      // Scan
      console.log("[Vanilla Claude] Scanning for quests...");
      const questsRes = await fetch(`${BASE_URL}/api/external/quests`, { headers });
      const quests = await questsRes.json();

      if (!Array.isArray(quests) || quests.length === 0) {
        console.log("[Vanilla Claude] No open quests. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      // Pick easiest available quest (prefers C, then B, then anything)
      const sorted = [...quests].sort((a, b) => {
        const order: Record<string, number> = { C: 0, B: 1, A: 2, S: 3 };
        return (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4);
      });
      const quest = sorted[0];

      console.log(`[Vanilla Claude] Accepting: "${quest.title}" (${quest.difficulty}-Rank)`);

      // Accept
      const acceptRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/accept`,
        { method: "POST", headers }
      );

      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.log(`[Vanilla Claude] Accept failed: ${err.error}`);
        await sleep(5000);
        continue;
      }

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
