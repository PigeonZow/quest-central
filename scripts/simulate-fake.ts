import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Fake Agent Simulator
 * Simulates CrewAI Collective, LangGraph Legends, and The Giga Swarm
 * scanning, accepting, and submitting quests with pre-canned results.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npm run simulate
 *
 * Requires party API keys to be set as env vars, or will fetch them from DB.
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PartyBehavior {
  name: string;
  apiKey: string;
  scanInterval: number; // ms between scans
  workTimeBase: number; // base work time in ms
  workTimePerDifficulty: Record<string, number>; // multiplier by difficulty
  preferredDifficulties: string[];
  resultTemplates: Record<string, string>;
}

const DIFFICULTY_WORK_TIME: Record<string, Record<string, number>> = {
  crew: { C: 8000, B: 15000, A: 22000, S: 28000 },
  pipeline: { C: 10000, B: 18000, A: 25000, S: 32000 },
  swarm: { C: 30000, B: 45000, A: 55000, S: 65000 },
};

const RESULT_TEMPLATES: Record<string, Record<string, string>> = {
  crew: {
    coding: "## CrewAI Solution\n\n**Researcher** gathered requirements and context.\n**Writer** implemented the solution with clean code patterns.\n**Reviewer** validated correctness and style.\n\nFinal output passed all internal quality checks.",
    writing: "## CrewAI Writing Output\n\n**Researcher** analyzed the topic and gathered references.\n**Writer** produced a well-structured piece with clear arguments.\n**Reviewer** polished grammar and flow.\n\nDelivered on time with consistent quality.",
    research: "## CrewAI Research Report\n\n**Researcher** conducted comprehensive literature review.\n**Writer** synthesized findings into actionable insights.\n**Reviewer** verified citations and logical consistency.\n\nReport meets academic standards.",
    default: "## CrewAI Output\n\nTask completed by the CrewAI Collective using our researcher-writer-reviewer pipeline. All agents contributed their specialized expertise to produce this result.",
  },
  pipeline: {
    coding: "## LangGraph Pipeline Result\n\n**Step 1 (Planner):** Decomposed task into sub-problems and identified approach.\n**Step 2 (Executor):** Implemented solution with iterative refinement (2 retries used).\n**Step 3 (Validator):** All assertions pass, code quality verified.\n\nPipeline completed successfully.",
    writing: "## LangGraph Pipeline Result\n\n**Step 1 (Planner):** Outlined structure and key points.\n**Step 2 (Executor):** Drafted content following the outline.\n**Step 3 (Validator):** Checked coherence, grammar, and completeness.\n\nOutput validated and ready.",
    default: "## LangGraph Pipeline Result\n\nSequential pipeline processed this task through planning, execution, and validation stages. Stateful graph maintained context across all nodes.",
  },
  swarm: {
    coding: "## Giga Swarm Result\n\n**Coordinator** decomposed into 8 sub-tasks.\n**Workers (10 parallel):** Each tackled a component — API layer, data models, business logic, error handling, tests, documentation, edge cases, performance optimization, security review, integration.\n**Aggregator** merged all components into cohesive solution.\n**Final Reviewer** polished and verified end-to-end.\n\nAll 12 agents contributed. Token cost: high. Quality: exceptional.",
    default: "## Giga Swarm Result\n\n12-agent parallel swarm deployed. Coordinator split the work, 10 workers executed in parallel, aggregator merged results, reviewer validated. Expensive but thorough.",
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getResult(archType: string, category: string): string {
  const templates = RESULT_TEMPLATES[archType] ?? RESULT_TEMPLATES.swarm;
  return templates[category] ?? templates.default ?? "Task completed.";
}

async function getPartyKeys(): Promise<Record<string, string>> {
  const partyNames = ["CrewAI Collective", "LangGraph Legends", "The Giga Swarm"];
  const keys: Record<string, string> = {};

  for (const name of partyNames) {
    const { data } = await supabase
      .from("parties")
      .select("api_key, architecture_type")
      .eq("name", name)
      .single();
    if (data) {
      keys[data.architecture_type] = data.api_key;
    }
  }
  return keys;
}

async function simulateParty(behavior: PartyBehavior) {
  const headers = {
    Authorization: `Bearer ${behavior.apiKey}`,
    "Content-Type": "application/json",
  };

  console.log(`[${behavior.name}] Starting simulation...`);

  while (true) {
    try {
      // Scan for quests
      console.log(`[${behavior.name}] Scanning for quests...`);
      const questsRes = await fetch(`${BASE_URL}/api/external/quests`, { headers });
      const quests = await questsRes.json();

      if (!Array.isArray(quests) || quests.length === 0) {
        console.log(`[${behavior.name}] No open quests. Waiting...`);
        await sleep(behavior.scanInterval);
        continue;
      }

      // Pick a quest based on preferences
      const preferred = quests.filter((q: { difficulty: string }) =>
        behavior.preferredDifficulties.includes(q.difficulty)
      );
      const pool = preferred.length > 0 ? preferred : quests;
      const quest = pool[Math.floor(Math.random() * pool.length)];

      console.log(`[${behavior.name}] Accepting: "${quest.title}" (${quest.difficulty}-Rank)`);

      // Accept
      const acceptRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/accept`,
        { method: "POST", headers }
      );

      if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.log(`[${behavior.name}] Accept failed: ${err.error}`);
        await sleep(5000);
        continue;
      }

      // "Work" on it
      const archKey = behavior.name.includes("CrewAI")
        ? "crew"
        : behavior.name.includes("LangGraph")
          ? "pipeline"
          : "swarm";
      const workTime = DIFFICULTY_WORK_TIME[archKey]?.[quest.difficulty] ?? 15000;
      const jitter = Math.random() * 5000 - 2500;
      const totalWork = Math.max(3000, workTime + jitter);

      console.log(`[${behavior.name}] Working... (${Math.round(totalWork / 1000)}s)`);
      await sleep(totalWork);

      // Submit
      const result = getResult(archKey, quest.category);
      const submitRes = await fetch(
        `${BASE_URL}/api/external/quests/${quest.id}/submit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            result_text: result,
            token_count: Math.floor(500 + Math.random() * 3000),
          }),
        }
      );

      if (submitRes.ok) {
        console.log(`[${behavior.name}] Submitted result for "${quest.title}"`);
      } else {
        const err = await submitRes.json();
        console.log(`[${behavior.name}] Submit failed: ${err.error}`);
      }
    } catch (err) {
      console.error(`[${behavior.name}] Error:`, err);
    }

    // Wait before next scan
    const nextScan = behavior.scanInterval + Math.random() * 3000;
    console.log(`[${behavior.name}] Next scan in ${Math.round(nextScan / 1000)}s\n`);
    await sleep(nextScan);
  }
}

async function main() {
  console.log("Fake Agent Simulator");
  console.log(`Base URL: ${BASE_URL}\n`);

  const keys = await getPartyKeys();

  if (!keys.crew || !keys.pipeline || !keys.swarm) {
    console.error("Missing party API keys. Run the seed script first: npm run seed");
    console.error("Found keys for:", Object.keys(keys));
    process.exit(1);
  }

  const behaviors: PartyBehavior[] = [
    {
      name: "CrewAI Collective",
      apiKey: keys.crew,
      scanInterval: 10000,
      workTimeBase: 8000,
      workTimePerDifficulty: { C: 1, B: 1.5, A: 2.5, S: 3.5 },
      preferredDifficulties: ["C", "B", "A"],
      resultTemplates: RESULT_TEMPLATES.crew,
    },
    {
      name: "LangGraph Legends",
      apiKey: keys.pipeline,
      scanInterval: 12000,
      workTimeBase: 10000,
      workTimePerDifficulty: { C: 1, B: 1.8, A: 2.5, S: 3.2 },
      preferredDifficulties: ["B", "A"],
      resultTemplates: RESULT_TEMPLATES.pipeline,
    },
    {
      name: "The Giga Swarm",
      apiKey: keys.swarm,
      scanInterval: 15000,
      workTimeBase: 30000,
      workTimePerDifficulty: { C: 1, B: 1.5, A: 1.8, S: 2.2 },
      preferredDifficulties: ["A", "S"],
      resultTemplates: RESULT_TEMPLATES.swarm,
    },
  ];

  // Run all three in parallel
  await Promise.all(behaviors.map(simulateParty));
}

main().catch(console.error);
