import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Vanilla OpenAI Agent
 * Single GPT-4o API call per quest. Fast, direct, no frills.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=your-party-api-key OPENAI_API_KEY=sk-... npx tsx scripts/agents/vanilla-openai.ts
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
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
    .eq("name", "Vanilla GPT-4o")
    .single();
  return data?.api_key ?? "";
}

async function callOpenAI(
  questTitle: string,
  questDescription: string,
  criteria: string | null
): Promise<{ text: string; tokens: number }> {
  if (!OPENAI_API_KEY) {
    return {
      text: `## Vanilla GPT-4o Response\n\nI've analyzed the task "${questTitle}" and here's my direct response:\n\n${questDescription}\n\nThis was completed in a single API call with no planning or review steps.`,
      tokens: 0,
    };
  }

  const systemPrompt = `You are an expert assistant. Complete the given task directly and thoroughly. Be concise but comprehensive.

CRITICAL FORMATTING RULES FOR YOUR SUBMISSION:
You are submitting a quest to a premium developer platform. Your response MUST be split into two parts: The ReadMe, and The Code.

PART 1: The ReadMe (Your Approach)
You MUST begin your response with a highly structured, beautiful markdown explanation of how you solved the quest. Do NOT write dense paragraphs. You must use the following formatting:
- **Headers:** Use markdown headers (e.g., ### Approach & Features) to title your explanation.
- **Bullet Points:** Break down your logic, game mechanics, and architecture into a clean bulleted list.
- **Bold Key Terms:** At the start of every bullet point, bold the feature name (e.g., - **Collision Detection:** I utilized bounding box math to...).
- **Clarity:** Keep the explanations concise, professional, and easy to scan.

PART 2: The Code
Following your ReadMe, provide your complete, functional code. All code MUST be wrapped in standard triple backticks with the language specified (e.g., \`\`\`html). Separate different files (HTML, CSS, JS) into their own code blocks. Never truncate — always output the full implementation.`;

  const userPrompt = `Task: ${questTitle}\n\nDescription: ${questDescription}${criteria ? `\n\nAcceptance Criteria: ${criteria}` : ""}\n\nComplete this task now. Provide your full response.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      max_completion_tokens: 16384,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("  OpenAI API error:", err);
    return { text: `Error: ${res.status}`, tokens: 0 };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "No response generated.";
  const tokens =
    (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);

  console.log(`  GPT-4o responded (${tokens} tokens)`);
  return { text, tokens };
}

/** Track quests we've already attempted so we don't retry them */
const attemptedQuestIds = new Set<string>();

/** Simple quest selection — prefer easier quests where a single call wins */
function selectQuest(quests: QuestListing[]): QuestListing | null {
  const available = quests.filter(
    (q) => q.slots_remaining > 0 && !attemptedQuestIds.has(q.id)
  );
  if (available.length === 0) return null;

  // Prefer easier quests — single-call agents shine on C and B rank
  const sorted = [...available].sort((a, b) => {
    const order: Record<string, number> = { C: 0, B: 1, A: 2, S: 3 };
    return (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4);
  });

  return sorted[0];
}

async function run() {
  console.log("Vanilla GPT-4o Agent");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `OpenAI API: ${OPENAI_API_KEY ? "configured" : "NOT SET (using fallback)"}\n`
  );

  if (!API_KEY) {
    console.log("No API_KEY env var, looking up from database...");
    API_KEY = await getApiKeyFromDb();
    if (!API_KEY) {
      console.error(
        'Could not find "Vanilla GPT-4o" party. Run seed first: npm run seed'
      );
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
      console.log("[Vanilla GPT-4o] Scanning for quests...");
      const questsRes = await fetch(`${BASE_URL}/api/external/quests`, {
        headers,
      });
      const quests: QuestListing[] = await questsRes.json();

      if (!Array.isArray(quests) || quests.length === 0) {
        console.log("[Vanilla GPT-4o] No open quests. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      const quest = selectQuest(quests);
      if (!quest) {
        console.log("[Vanilla GPT-4o] No new quests available. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      console.log(
        `[Vanilla GPT-4o] Accepting: "${quest.title}" (${quest.difficulty}-Rank)`
      );

      // Accept
      const acceptRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/accept`,
        { method: "POST", headers }
      );

      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.log(`[Vanilla GPT-4o] Accept failed: ${err.error}`);
        attemptedQuestIds.add(quest.id);
        await sleep(5000);
        continue;
      }

      attemptedQuestIds.add(quest.id);

      // Single GPT-4o call
      console.log("[Vanilla GPT-4o] Making single GPT-4o API call...");
      const { text: result, tokens } = await callOpenAI(
        quest.title,
        quest.description,
        quest.acceptance_criteria
      );

      // Submit
      const submitRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/submit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            result_text: result,
            token_count: tokens,
          }),
        }
      );

      if (submitRes.ok) {
        console.log(
          `[Vanilla GPT-4o] Submitted for "${quest.title}" (${tokens} tokens)\n`
        );
      } else {
        const err = await submitRes.json();
        console.log(`[Vanilla GPT-4o] Submit failed: ${err.error}\n`);
      }
    } catch (err) {
      console.error("[Vanilla GPT-4o] Error:", err);
    }

    await sleep(SCAN_INTERVAL);
  }
}

run().catch(console.error);
