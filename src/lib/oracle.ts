/**
 * The Oracle — Evaluation & ranking engine for Quest Central
 *
 * Uses OpenAI GPT-4o as an impartial LLM judge to evaluate quest attempt
 * results, rank competing submissions, and classify quest difficulty.
 * Falls back to heuristics if no API key is configured.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface OracleEvaluation {
  feedback: string;    // Short explanation of quality
}

interface OracleRankedEntry {
  id: string;
}

/**
 * Evaluate a single quest attempt — returns qualitative feedback (no numeric score).
 */
export async function evaluateAttempt(
  questTitle: string,
  questDescription: string,
  acceptanceCriteria: string | null,
  difficulty: string,
  resultText: string
): Promise<OracleEvaluation> {
  if (!OPENAI_API_KEY || !resultText) {
    return heuristicEvaluate(resultText);
  }

  try {
    return await llmEvaluate(
      questTitle,
      questDescription,
      acceptanceCriteria,
      difficulty,
      resultText
    );
  } catch (err) {
    console.error("[Oracle] GPT-4o evaluation failed, using heuristic:", err);
    return heuristicEvaluate(resultText);
  }
}

/**
 * Rank multiple quest attempts relative to each other.
 * Returns an ordered array (best first).
 */
export async function rankAttempts(
  questTitle: string,
  questDescription: string,
  acceptanceCriteria: string | null,
  attempts: { id: string; result_text: string }[]
): Promise<OracleRankedEntry[]> {
  if (attempts.length <= 1) {
    return attempts.map((a) => ({ id: a.id }));
  }

  if (!OPENAI_API_KEY) {
    return heuristicRank(attempts);
  }

  try {
    return await llmRank(questTitle, questDescription, acceptanceCriteria, attempts);
  } catch (err) {
    console.error("[Oracle] GPT-4o ranking failed, using heuristic:", err);
    return heuristicRank(attempts);
  }
}

/**
 * Classify a quest's difficulty as C/B/A/S based on its description.
 * Used when a quest is posted to auto-assign difficulty.
 */
export async function classifyDifficulty(
  title: string,
  description: string,
  acceptanceCriteria: string | null
): Promise<{ difficulty: "C" | "B" | "A" | "S"; reasoning: string }> {
  if (!OPENAI_API_KEY) {
    return heuristicDifficulty(description, acceptanceCriteria);
  }

  try {
    return await llmClassifyDifficulty(title, description, acceptanceCriteria);
  } catch (err) {
    console.error("[Oracle] GPT-4o difficulty classification failed, using heuristic:", err);
    return heuristicDifficulty(description, acceptanceCriteria);
  }
}

// ─── OpenAI GPT-4o implementations ───

async function llmEvaluate(
  title: string,
  description: string,
  criteria: string | null,
  difficulty: string,
  result: string
): Promise<OracleEvaluation> {
  const systemPrompt = `You are the Oracle — an impartial judge for Quest Central, an AI agent orchestration marketplace.

Your job is to evaluate a quest attempt and provide brief qualitative feedback.
Focus on whether the result addresses the task requirements and acceptance criteria.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{"feedback": "<one sentence evaluation>"}`;

  const userPrompt = `## Quest
**Title:** ${title}
**Difficulty:** ${difficulty}-Rank
**Description:** ${description}
${criteria ? `**Acceptance Criteria:** ${criteria}` : "**Acceptance Criteria:** None specified — judge based on task description."}

## Submitted Result
${result.slice(0, 8000)}

Evaluate this attempt now.`;

  const text = await callOpenAI(systemPrompt, userPrompt);
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error("Oracle response was not valid JSON");

  const parsed = JSON.parse(jsonMatch[0]);
  return { feedback: parsed.feedback || "No feedback provided." };
}

async function llmRank(
  title: string,
  description: string,
  criteria: string | null,
  attempts: { id: string; result_text: string }[]
): Promise<OracleRankedEntry[]> {
  const systemPrompt = `You are the Oracle — an impartial judge for Quest Central.

You will be given multiple submissions for the same quest. Rank them from best to worst.

IMPORTANT: Respond ONLY with valid JSON — an array of submission IDs in order from best to worst:
["best_id", "second_best_id", ...]`;

  const submissionsText = attempts
    .map((a, i) => `### Submission ${i + 1} (ID: ${a.id})\n${(a.result_text ?? "").slice(0, 4000)}`)
    .join("\n\n---\n\n");

  const userPrompt = `## Quest
**Title:** ${title}
**Description:** ${description}
${criteria ? `**Acceptance Criteria:** ${criteria}` : ""}

## Submissions
${submissionsText}

Rank these submissions from best to worst.`;

  const text = await callOpenAI(systemPrompt, userPrompt, 512);
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) throw new Error("Oracle ranking response was not valid JSON");

  const rankedIds: string[] = JSON.parse(jsonMatch[0]);
  const attemptIds = new Set(attempts.map((a) => a.id));

  // Filter to only valid IDs and ensure all attempts are included
  const validRanked = rankedIds.filter((id) => attemptIds.has(id));
  const missing = attempts.filter((a) => !validRanked.includes(a.id));
  const finalOrder = [...validRanked, ...missing.map((a) => a.id)];

  return finalOrder.map((id) => ({ id }));
}

async function llmClassifyDifficulty(
  title: string,
  description: string,
  criteria: string | null
): Promise<{ difficulty: "C" | "B" | "A" | "S"; reasoning: string }> {
  const systemPrompt = `You are the Oracle — an impartial judge for Quest Central, an AI agent orchestration marketplace.

Classify this quest's difficulty for AI Agents:
- C-Rank (Easy): An LLM Agent should be able to do this pretty consistently.
- B-Rank (Medium): Multi-step tasks requiring moderate effort. Some domain knowledge or tool use.
- A-Rank (Hard): Complex tasks requiring significant effort, multiple skills, or deep domain/human expertise.
- S-Rank (Legendary): Extremely challenging tasks requiring exceptional skill, creativity, or extensive multi-step work. You are not sure if LLMs are even capable of solving this task.

IMPORTANT: Respond ONLY with valid JSON:
{"difficulty": "C"|"B"|"A"|"S", "reasoning": "<one sentence explanation>"}`;

  const userPrompt = `## Quest
**Title:** ${title}
**Description:** ${description}
${criteria ? `**Acceptance Criteria:** ${criteria}` : ""}

Classify this quest's difficulty.`;

  const text = await callOpenAI(systemPrompt, userPrompt);
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error("Oracle response was not valid JSON");

  const parsed = JSON.parse(jsonMatch[0]);
  const difficulty = ["C", "B", "A", "S"].includes(parsed.difficulty) ? parsed.difficulty : "C";
  return { difficulty, reasoning: parsed.reasoning || "Classified by Oracle." };
}

// ─── OpenAI Chat Completions API ───

async function callOpenAI(systemPrompt: string, userPrompt: string, maxTokens = 256): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API returned ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Heuristic fallbacks ───

function heuristicRank(attempts: { id: string; result_text: string }[]): OracleRankedEntry[] {
  return [...attempts]
    .sort((a, b) => (b.result_text?.length ?? 0) - (a.result_text?.length ?? 0))
    .map((a) => ({ id: a.id }));
}

function heuristicEvaluate(resultText: string): OracleEvaluation {
  if (!resultText) {
    return { feedback: "No result submitted." };
  }
  const len = resultText.length;
  if (len > 2000) return { feedback: "Substantial response provided. Configure OPENAI_API_KEY for detailed evaluation." };
  if (len > 500) return { feedback: "Moderate response provided. Configure OPENAI_API_KEY for detailed evaluation." };
  return { feedback: "Brief response provided. Configure OPENAI_API_KEY for detailed evaluation." };
}

function heuristicDifficulty(
  description: string,
  criteria: string | null
): { difficulty: "C" | "B" | "A" | "S"; reasoning: string } {
  const len = description.length + (criteria?.length ?? 0);
  let difficulty: "C" | "B" | "A" | "S" = "C";
  if (len > 2000) difficulty = "S";
  else if (len > 1000) difficulty = "A";
  else if (len > 400) difficulty = "B";

  return {
    difficulty,
    reasoning: `Classified by heuristic (${len} chars). Configure OPENAI_API_KEY for Oracle-powered classification.`,
  };
}
