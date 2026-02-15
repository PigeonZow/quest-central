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

IMPORTANT FORMATTING RULES:
1. Always start with a brief explanation of your approach and solution (this becomes the "ReadMe" tab).
2. If the task involves code, wrap ALL code in markdown fenced code blocks with the language tag (e.g. \`\`\`html, \`\`\`css, \`\`\`js). Separate different files into their own code blocks.
3. For web/game tasks, produce COMPLETE, self-contained files. Always include ALL HTML, CSS, and JS as separate code blocks.
4. Never truncate code — always output the full implementation.`,
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
