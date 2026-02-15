import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Claude Agent SDK Party — multi-step pipeline: Plan → Execute → Review.
 *
 * Usage:
 *   API_KEY=your-key npx tsx scripts/agents/claude-sdk-agent.ts
 */

import { QuestRunner, Quest, QuestResult } from "./lib/quest-runner";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 2048
): Promise<{ text: string; tokens: number }> {
  if (!ANTHROPIC_API_KEY) {
    return { text: userMessage.slice(0, 200) + "...", tokens: 0 };
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
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("  Claude API error:", err);
    return { text: `Error: ${res.status}`, tokens: 0 };
  }

  const data = await res.json();
  return {
    text: data.content?.[0]?.text ?? "",
    tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
  };
}

// ── solve_quest: 3-phase pipeline ──────────────────────────────────

async function solve_quest(quest: Quest): Promise<QuestResult> {
  let totalTokens = 0;
  const criteria = quest.acceptance_criteria;

  // Step 1: PLAN
  console.log("  Step 1: Planning approach...");
  const plan = await callClaude(
    "You are a meticulous planning agent. Break tasks into clear, actionable steps.",
    `Analyze this task and create a clear execution plan.\n\nTask: ${quest.title}\nDescription: ${quest.description}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}\n\nOutput a numbered plan with 3-5 steps.`,
    1024
  );
  totalTokens += plan.tokens;
  console.log(`  Plan created (${plan.tokens} tokens)`);

  // Step 2: EXECUTE
  console.log("  Step 2: Executing plan...");
  const execution = await callClaude(
    "You are an expert execution agent. Follow the given plan precisely and produce high-quality output.",
    `Follow this plan to complete the task.\n\nTask: ${quest.title}\nDescription: ${quest.description}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}\n\nPlan to follow:\n${plan.text}\n\nExecute the plan step by step. Provide your complete output.`,
    3072
  );
  totalTokens += execution.tokens;
  console.log(`  Execution complete (${execution.tokens} tokens)`);

  // Step 3: REVIEW
  console.log("  Step 3: Self-reviewing...");
  const review = await callClaude(
    "You are a critical review agent. Evaluate output quality and improve if needed.",
    `Review the following output against the original task.\n\nTask: ${quest.title}\nDescription: ${quest.description}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}\n\nOutput to review:\n${execution.text}\n\nIf good, approve it. If improvements are needed, provide the improved version.`,
    3072
  );
  totalTokens += review.tokens;
  console.log(`  Review complete (${review.tokens} tokens)`);

  return {
    result_text: review.text,
    token_count: totalTokens,
  };
}

// ── select_quest: prefer harder quests ─────────────────────────────
// Multi-step pipelines shine on complex tasks.

async function select_quest(quests: Quest[]): Promise<Quest | null> {
  const available = quests.filter((q) => q.slots_remaining > 0);
  if (available.length === 0) return null;

  const order: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
  const sorted = [...available].sort(
    (a, b) => (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4)
  );
  return sorted[0];
}

// ── Run ────────────────────────────────────────────────────────────

const runner = new QuestRunner({
  apiKey: process.env.API_KEY,
  partyName: "Claude Agent SDK Party",
  baseUrl: process.env.BASE_URL,
  scanInterval: 15_000,
  name: "Claude SDK Agent",
  solve_quest,
  select_quest,
});

runner.start().catch(console.error);
