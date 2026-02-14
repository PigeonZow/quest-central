/**
 * The Oracle — Auto-scoring engine for Quest Central
 *
 * Uses Claude to evaluate quest attempt results against acceptance criteria.
 * Falls back to a heuristic score if no API key is configured.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface OracleVerdict {
  score: number;       // 0–100
  feedback: string;    // Short explanation
}

/**
 * Score a quest attempt by evaluating the result against the quest criteria.
 * Uses Claude if ANTHROPIC_API_KEY is set, otherwise falls back to heuristic.
 */
export async function scoreAttempt(
  questTitle: string,
  questDescription: string,
  acceptanceCriteria: string | null,
  difficulty: string,
  resultText: string
): Promise<OracleVerdict> {
  if (!ANTHROPIC_API_KEY || !resultText) {
    return heuristicScore(resultText, difficulty);
  }

  try {
    return await claudeScore(
      questTitle,
      questDescription,
      acceptanceCriteria,
      difficulty,
      resultText
    );
  } catch (err) {
    console.error("[Oracle] Claude scoring failed, using heuristic:", err);
    return heuristicScore(resultText, difficulty);
  }
}

async function claudeScore(
  title: string,
  description: string,
  criteria: string | null,
  difficulty: string,
  result: string
): Promise<OracleVerdict> {
  const systemPrompt = `You are the Oracle — an impartial judge for Quest Central, an AI agent orchestration marketplace.

Your job is to score a quest attempt from 0 to 100. Be fair, consistent, and calibrate your score to the difficulty level.

Scoring guidelines:
- 90–100: Exceptional — exceeds requirements, elegant solution
- 70–89: Good — meets all acceptance criteria, solid work
- 50–69: Partial — addresses the task but misses some criteria
- 30–49: Weak — minimal effort or missing key requirements
- 0–29: Failed — does not meaningfully address the task

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{"score": <number 0-100>, "feedback": "<one sentence explanation>"}`;

  const userPrompt = `## Quest
**Title:** ${title}
**Difficulty:** ${difficulty}-Rank
**Description:** ${description}
${criteria ? `**Acceptance Criteria:** ${criteria}` : "**Acceptance Criteria:** None specified — judge based on task description."}

## Submitted Result
${result.slice(0, 8000)}

Score this attempt now.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API returned ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    throw new Error("Oracle response was not valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  const feedback = parsed.feedback || "No feedback provided.";

  return { score, feedback };
}

/**
 * Fallback heuristic scoring based on result length and difficulty.
 * Used when no Anthropic API key is configured.
 */
function heuristicScore(resultText: string, difficulty: string): OracleVerdict {
  if (!resultText) {
    return { score: 0, feedback: "No result submitted." };
  }

  const len = resultText.length;
  // Base score from content length (rough proxy for effort)
  let base: number;
  if (len > 2000) base = 75;
  else if (len > 1000) base = 65;
  else if (len > 500) base = 55;
  else if (len > 100) base = 45;
  else base = 25;

  // Add some variance
  const jitter = Math.floor(Math.random() * 15) - 7;
  const score = Math.max(10, Math.min(95, base + jitter));

  return {
    score,
    feedback: `Scored by heuristic (${len} chars, ${difficulty}-Rank). Configure ANTHROPIC_API_KEY for Claude-powered evaluation.`,
  };
}
