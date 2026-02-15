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
  const planPrompt = `You are a planning agent. Analyze this task and create a clear execution plan.

Task: ${quest.title}
Description: ${quest.description}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Output a numbered plan with 3-5 steps. Be specific about what each step should accomplish.`;

  const plan = await callClaude(
    "You are a meticulous planning agent. Break tasks into clear, actionable steps.",
    planPrompt,
    2048
  );
  totalTokens += plan.tokens;
  console.log(`  Plan created (${plan.tokens} tokens)`);

  // Step 2: EXECUTE
  console.log("  Step 2: Executing plan...");
  const executePrompt = `You are an execution agent. Follow this plan to complete the task.

Task: ${quest.title}
Description: ${quest.description}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Plan to follow:
${plan.text}

Now execute the plan step by step. Provide your complete, thorough output.`;

  const execution = await callClaude(
    `You are an expert execution agent. Follow the given plan precisely and produce high-quality output. Be thorough and detailed.

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
    executePrompt,
    16384
  );
  totalTokens += execution.tokens;
  console.log(`  Execution complete (${execution.tokens} tokens)`);

  // Step 3: REVIEW & POLISH
  console.log("  Step 3: Reviewing & polishing...");
  const reviewPrompt = `You are a quality-assurance agent. Your job is to produce the FINAL deliverable for this task.

Original Task: ${quest.title}
Description: ${quest.description}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Draft output to review:
${execution.text}

Instructions:
- If the draft is good, output it exactly as-is (no commentary, no "review passed" notes).
- If the draft has errors, missing parts, or could be improved, output the CORRECTED/IMPROVED version.
- Your output IS the final submission. Do NOT include any meta-commentary, review notes, or self-assessment.
- Do NOT wrap the output in extra headings like "Final Version" or "Improved Version" — just output the work itself.`;

  const review = await callClaude(
    `You are a critical review agent. Evaluate output quality and improve if needed. If the output is already good, approve it. Always return the final output.

CRITICAL: The final output MUST have exactly two parts — preserve BOTH:
1. PART 1 (ReadMe): A structured markdown explanation at the top using headers, bullet points, and bold key terms. If this section is missing or weak, ADD one.
2. PART 2 (Code): All code in properly fenced markdown code blocks with language tags (\`\`\`html, \`\`\`css, \`\`\`js, etc.).
Never strip the ReadMe or the code blocks. Never output raw unformatted code. Preserve the complete structure.`,
    reviewPrompt,
    16384
  );
  totalTokens += review.tokens;
  console.log(`  Review complete (${review.tokens} tokens)`);

  // Submit only the polished final output — not the plan or review scaffolding
  return { result_text: review.text, token_count: totalTokens };
}

// ── select_quest (optional): party leader logic ────────────────────
// Prefer harder quests (A and S rank) - this is where the multi-step approach shines.

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
