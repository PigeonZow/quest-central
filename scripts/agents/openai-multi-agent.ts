import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * OpenAI Multi-Step Agent
 * Three-phase pipeline: Plan → Execute → Review, all powered by GPT-4o.
 * Mirrors the Claude Agent SDK agent but uses the OpenAI API.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=your-party-api-key OPENAI_API_KEY=sk-... npx tsx scripts/agents/openai-multi-agent.ts
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let API_KEY = process.env.API_KEY || "";

const SCAN_INTERVAL = 15000; // 15s between scans (slower, more deliberate)

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
    .eq("name", "GPT-4o Pipeline")
    .single();
  return data?.api_key ?? "";
}

async function callOpenAI(
  system: string,
  userMessage: string,
  maxTokens = 2048
): Promise<{ text: string; tokens: number }> {
  if (!OPENAI_API_KEY) {
    return { text: userMessage.slice(0, 200) + "...", tokens: 0 };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("  OpenAI API error:", err);
    return { text: `Error: ${res.status}`, tokens: 0 };
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    tokens:
      (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0),
  };
}

async function multiStepAgent(
  questTitle: string,
  questDescription: string,
  criteria: string | null
): Promise<{ result: string; totalTokens: number }> {
  let totalTokens = 0;

  // Step 1: PLAN
  console.log("  Step 1: Planning approach...");
  const planPrompt = `You are a planning agent. Analyze this task and create a clear execution plan.

Task: ${questTitle}
Description: ${questDescription}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Output a numbered plan with 3-5 steps. Be specific about what each step should accomplish.`;

  const plan = await callOpenAI(
    "You are a meticulous planning agent. Break tasks into clear, actionable steps.",
    planPrompt,
    2048
  );
  totalTokens += plan.tokens;
  console.log(`  Plan created (${plan.tokens} tokens)`);

  // Step 2: EXECUTE
  console.log("  Step 2: Executing plan...");
  const executePrompt = `You are an execution agent. Follow this plan to complete the task.

Task: ${questTitle}
Description: ${questDescription}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Plan to follow:
${plan.text}

Now execute the plan step by step. Provide your complete, thorough output.`;

  const execution = await callOpenAI(
    `You are an expert execution agent. Follow the given plan precisely and produce high-quality output. Be thorough and detailed.

IMPORTANT FORMATTING RULES:
1. Start with a brief explanation of your approach and solution (this becomes the "ReadMe" tab for reviewers).
2. If the task involves code, wrap ALL code in markdown fenced code blocks with the language tag (e.g. \`\`\`html, \`\`\`css, \`\`\`js). Separate different files into their own code blocks.
3. For web/game tasks, produce COMPLETE, self-contained files. Always include ALL HTML, CSS, and JS as separate code blocks.
4. Never truncate code — always output the full implementation.
5. Do not ever output raw HTML/code as plain text.`,
    executePrompt,
    16384
  );
  totalTokens += execution.tokens;
  console.log(`  Execution complete (${execution.tokens} tokens)`);

  // Step 3: REVIEW & POLISH
  console.log("  Step 3: Reviewing & polishing...");
  const reviewPrompt = `You are a quality-assurance agent. Your job is to produce the FINAL deliverable for this task.

Original Task: ${questTitle}
Description: ${questDescription}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Draft output to review:
${execution.text}

Instructions:
- If the draft is good, output it exactly as-is (no commentary, no "review passed" notes).
- If the draft has errors, missing parts, or could be improved, output the CORRECTED/IMPROVED version.
- Your output IS the final submission. Do NOT include any meta-commentary, review notes, or self-assessment.
- Do NOT wrap the output in extra headings like "Final Version" or "Improved Version" — just output the work itself.`;

  const review = await callOpenAI(
    `You are a critical review agent. Evaluate output quality and improve if needed. If the output is already good, approve it. Always return the final output.

IMPORTANT: The output MUST contain both:
1. A brief explanation/readme section (plain markdown, no code fences) at the top.
2. All code in properly fenced markdown code blocks with language tags.
Never strip the explanation or the code blocks. Preserve both. Do not ever output raw HTML/code as plain text.`,
    reviewPrompt,
    16384
  );
  totalTokens += review.tokens;
  console.log(`  Review complete (${review.tokens} tokens)`);

  return { result: review.text, totalTokens };
}

async function run() {
  console.log("GPT-4o Pipeline Agent (Multi-Step)");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `OpenAI API: ${OPENAI_API_KEY ? "configured" : "NOT SET (using fallback)"}\n`
  );

  if (!API_KEY) {
    console.log("No API_KEY env var, looking up from database...");
    API_KEY = await getApiKeyFromDb();
    if (!API_KEY) {
      console.error(
        'Could not find "GPT-4o Pipeline" party. Run seed first: npm run seed'
      );
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
      console.log("[GPT-4o Pipeline] Scanning for quests...");
      const questsRes = await fetch(`${BASE_URL}/api/external/quests`, {
        headers,
      });
      const quests = await questsRes.json();

      if (!Array.isArray(quests) || quests.length === 0) {
        console.log("[GPT-4o Pipeline] No open quests. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      // Prefer harder quests — multi-step pipeline shines on A and S rank
      const sorted = [...quests]
        .filter((q) => !attemptedQuestIds.has(q.id))
        .sort((a, b) => {
          const order: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
          return (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4);
        });

      if (sorted.length === 0) {
        console.log("[GPT-4o Pipeline] No new quests available. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      const quest = sorted[0];

      console.log(
        `[GPT-4o Pipeline] Accepting: "${quest.title}" (${quest.difficulty}-Rank)`
      );

      // Accept
      const acceptRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/accept`,
        { method: "POST", headers }
      );

      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.log(`[GPT-4o Pipeline] Accept failed: ${err.error}`);
        attemptedQuestIds.add(quest.id);
        await sleep(5000);
        continue;
      }

      attemptedQuestIds.add(quest.id);

      // Multi-step execution
      console.log("[GPT-4o Pipeline] Starting multi-step execution...");
      const { result, totalTokens } = await multiStepAgent(
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
            token_count: totalTokens,
          }),
        }
      );

      if (submitRes.ok) {
        console.log(
          `[GPT-4o Pipeline] Submitted for "${quest.title}" (${totalTokens} total tokens)\n`
        );
      } else {
        const err = await submitRes.json();
        console.log(`[GPT-4o Pipeline] Submit failed: ${err.error}\n`);
      }
    } catch (err) {
      console.error("[GPT-4o Pipeline] Error:", err);
    }

    await sleep(SCAN_INTERVAL);
  }
}

run().catch(console.error);
