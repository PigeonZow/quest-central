import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Claude Agent SDK Party
 * Multi-step agent: Plans approach → Executes with tool context → Self-reviews.
 * This is the Anthropic prize showcase.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=your-party-api-key ANTHROPIC_API_KEY=sk-... npx tsx scripts/agents/claude-sdk-agent.ts
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
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
    .eq("name", "Claude Agent SDK Party")
    .single();
  return data?.api_key ?? "";
}

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

  const plan = await callClaude(
    "You are a meticulous planning agent. Break tasks into clear, actionable steps.",
    planPrompt,
    1024
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

  const execution = await callClaude(
    "You are an expert execution agent. Follow the given plan precisely and produce high-quality output. Be thorough and detailed.",
    executePrompt,
    3072
  );
  totalTokens += execution.tokens;
  console.log(`  Execution complete (${execution.tokens} tokens)`);

  // Step 3: REVIEW
  console.log("  Step 3: Self-reviewing...");
  const reviewPrompt = `You are a review agent. Evaluate the following output against the original task requirements.

Original Task: ${questTitle}
Description: ${questDescription}${criteria ? `\nAcceptance Criteria: ${criteria}` : ""}

Output to review:
${execution.text}

Review the output for:
1. Completeness - does it fully address the task?
2. Quality - is the output well-structured and clear?
3. Accuracy - are there any errors or issues?

If the output is good, return it as-is with a brief "Review passed" note at the end.
If improvements are needed, provide the improved version.`;

  const review = await callClaude(
    "You are a critical review agent. Evaluate output quality and improve if needed. If the output is already good, approve it. Always return the final output.",
    reviewPrompt,
    3072
  );
  totalTokens += review.tokens;
  console.log(`  Review complete (${review.tokens} tokens)`);

  const finalResult = `## Claude Agent SDK Party - Multi-Step Result

### Planning Phase
${plan.text}

### Execution Result
${execution.text}

### Review
${review.text}

---
*Completed via 3-step agent pipeline: Plan → Execute → Review*
*Total tokens used: ${totalTokens}*`;

  return { result: finalResult, totalTokens };
}

async function run() {
  console.log("Claude Agent SDK Party (Multi-Step Agent)");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Anthropic API: ${ANTHROPIC_API_KEY ? "configured" : "NOT SET (using fallback)"}\n`);

  if (!API_KEY) {
    console.log("No API_KEY env var, looking up from database...");
    API_KEY = await getApiKeyFromDb();
    if (!API_KEY) {
      console.error("Could not find Claude Agent SDK Party. Run seed first: npm run seed");
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
      console.log("[Claude SDK Agent] Scanning for quests...");
      const questsRes = await fetch(`${BASE_URL}/api/external/quests`, { headers });
      const quests = await questsRes.json();

      if (!Array.isArray(quests) || quests.length === 0) {
        console.log("[Claude SDK Agent] No open quests. Waiting...");
        await sleep(SCAN_INTERVAL);
        continue;
      }

      // Prefer harder quests (A and S rank) - this is where the multi-step approach shines
      const sorted = [...quests].sort((a, b) => {
        const order: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
        return (order[a.difficulty] ?? 4) - (order[b.difficulty] ?? 4);
      });
      const quest = sorted[0];

      console.log(`[Claude SDK Agent] Accepting: "${quest.title}" (${quest.difficulty}-Rank)`);

      // Accept
      const acceptRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/accept`,
        { method: "POST", headers }
      );

      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.log(`[Claude SDK Agent] Accept failed: ${err.error}`);
        await sleep(5000);
        continue;
      }

      // Multi-step execution
      console.log("[Claude SDK Agent] Starting multi-step execution...");
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
        console.log(`[Claude SDK Agent] Submitted for "${quest.title}" (${totalTokens} total tokens)\n`);
      } else {
        const err = await submitRes.json();
        console.log(`[Claude SDK Agent] Submit failed: ${err.error}\n`);
      }
    } catch (err) {
      console.error("[Claude SDK Agent] Error:", err);
    }

    await sleep(SCAN_INTERVAL);
  }
}

run().catch(console.error);
