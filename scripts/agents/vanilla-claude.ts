import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Vanilla Claude — single API call per quest. Fast, simple, no frills.
 *
 * Usage:
 *   API_KEY=your-key npx tsx scripts/agents/vanilla-claude.ts
 */

import { QuestRunner, Quest, QuestResult } from "./lib/quest-runner";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── solve_quest: your agent logic ──────────────────────────────────
// This is the only part that matters. Everything else is handled by QuestRunner.

async function solve_quest(quest: Quest): Promise<QuestResult> {
  if (!ANTHROPIC_API_KEY) {
    return {
      result_text: `## Vanilla Claude Response\n\nTask: "${quest.title}"\n\n${quest.description}\n\nCompleted in a single call.`,
      token_count: 0,
    };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 16384,
      system: `You are an expert assistant. Complete the given task directly and thoroughly.

CRITICAL FORMATTING RULES FOR YOUR SUBMISSION:
You are submitting a quest to a premium developer platform. Your response MUST be split into two parts: The ReadMe, and The Code.

PART 1: The ReadMe (Your Approach)
You MUST begin your response with a highly structured, beautiful markdown explanation of how you solved the quest. Do NOT write dense paragraphs. You must use the following formatting:
- **Headers:** Use markdown headers (e.g., ### Approach & Features) to title your explanation.
- **Bullet Points:** Break down your logic, game mechanics, and architecture into a clean bulleted list.
- **Bold Key Terms:** At the start of every bullet point, bold the feature name (e.g., - **Collision Detection:** I utilized bounding box math to...).
- **Clarity:** Keep the explanations concise, professional, and easy to scan.

PART 2: The Code
Following your ReadMe, provide your complete, functional code. All code MUST be wrapped in standard triple backticks with the language specified (e.g., \`\`\`html). Separate different files (HTML, CSS, JS) into their own code blocks. Never truncate — always output the full implementation.`,
      messages: [{
        role: "user",
        content: `Task: ${quest.title}\n\nDescription: ${quest.description}${quest.acceptance_criteria ? `\n\nAcceptance Criteria: ${quest.acceptance_criteria}` : ""}\n\nComplete this task now.`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("  Claude API error:", err);
    return { result_text: `Error: ${res.status}`, token_count: 0 };
  }

  const data = await res.json();
  const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
  console.log(`  Claude responded (${tokens} tokens)`);

  return {
    result_text: data.content?.[0]?.text ?? "No response generated.",
    token_count: tokens,
  };
}

// ── select_quest (optional): party leader logic ────────────────────
// Prefer easier quests — vanilla shines on speed, not complexity.

async function select_quest(quests: Quest[]): Promise<Quest | null> {
  const available = quests.filter((q) => q.slots_remaining > 0);
  if (available.length === 0) return null;

  const order: Record<string, number> = { C: 0, B: 1, A: 2, S: 3 };
  const sorted = [...available].sort(
    (a, b) => (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4)
  );
  return sorted[0];
}

// ── Run ────────────────────────────────────────────────────────────

const runner = new QuestRunner({
  apiKey: process.env.API_KEY,
  partyName: "Vanilla Claude",
  baseUrl: process.env.BASE_URL,
  scanInterval: 8_000,
  name: "Vanilla Claude",
  solve_quest,
  select_quest,
});

runner.start().catch(console.error);
