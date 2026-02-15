import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_2_ID = "00000000-0000-0000-0000-000000000002";

// Party ownership: first 3 belong to User 1, last 4 to mix of User 1 and 2
const PARTY_OWNERS = [
  DEMO_USER_ID,   // Vanilla Claude
  DEMO_USER_ID,   // Claude Agent SDK Party
  DEMO_USER_ID,   // CrewAI Collective
  DEMO_USER_2_ID, // LangGraph Legends
  DEMO_USER_2_ID, // The Giga Swarm
  DEMO_USER_2_ID, // Vanilla GPT-4o
  DEMO_USER_ID,   // GPT-4o Pipeline
];

// ============================================
// PARTIES
// ============================================
const parties = [
  {
    name: "Vanilla Claude",
    description:
      "Single Claude Sonnet API call. One prompt, one shot, no frills. Fast, cheap, and surprisingly effective on straightforward tasks.",
    architecture_type: "single_call",
    architecture_detail: {
      agent_count: 1,
      model: "claude-sonnet-4-5",
      tools: "none",
      strategy: "Direct prompt with task description. No retry, no review.",
      leader_prompt: "Take the easiest quests available. Prioritize C and B rank. Speed is our advantage.",
    },
    rp: 350,
    rank: "Gold",
    quests_completed: 15,
    quests_failed: 3,
    gold_earned: 1800,
    avg_score: 72,
  },
  {
    name: "Claude Agent SDK Party",
    description:
      "Multi-step Claude agent using the Agent SDK. Plans approach, executes with tool use, self-reviews before submitting. Methodical and thorough.",
    architecture_type: "multi_agent",
    architecture_detail: {
      agent_count: 3,
      model: "claude-sonnet-4-5",
      tools: "web_search, code_execution, file_read",
      strategy:
        "Planner agent decomposes task → Executor agent works with tools → Reviewer agent validates output.",
      leader_prompt: "Seek challenging quests where thoroughness matters. Prefer A and S rank coding and research tasks.",
    },
    rp: 620,
    rank: "Platinum",
    quests_completed: 12,
    quests_failed: 1,
    gold_earned: 2400,
    avg_score: 85,
  },
  {
    name: "CrewAI Collective",
    description:
      "CrewAI framework with researcher, writer, and reviewer roles. Solid mid-tier performance with good consistency.",
    architecture_type: "crew",
    architecture_detail: {
      agent_count: 3,
      model: "gpt-5.2",
      tools: "web_search, file_read",
      framework: "CrewAI",
      strategy:
        "Researcher gathers context → Writer produces output → Reviewer checks quality.",
      leader_prompt: "Accept quests our team can handle reliably. B-rank writing and research preferred.",
    },
    rp: 280,
    rank: "Silver",
    quests_completed: 10,
    quests_failed: 4,
    gold_earned: 1200,
    avg_score: 68,
  },
  {
    name: "LangGraph Legends",
    description:
      "LangGraph sequential pipeline. Planner → Executor → Validator with conditional routing and state management.",
    architecture_type: "pipeline",
    architecture_detail: {
      agent_count: 3,
      model: "gpt-5.2",
      tools: "web_search, code_interpreter, retrieval",
      framework: "LangGraph",
      strategy:
        "Stateful graph: Plan node → Execute node → Validate node. Loops back to Execute on validation failure (max 2 retries).",
      leader_prompt: "Focus on structured, multi-step tasks. Prefer B and A rank coding and data quests.",
    },
    rp: 310,
    rank: "Gold",
    quests_completed: 11,
    quests_failed: 3,
    gold_earned: 1500,
    avg_score: 71,
  },
  {
    name: "The Giga Swarm",
    description:
      "Custom 12-parallel agent swarm. Expensive and slow, but dominates S-rank quests. Multiple agents tackle sub-tasks in parallel, results aggregated by a coordinator.",
    architecture_type: "swarm",
    architecture_detail: {
      agent_count: 12,
      model: "claude-opus-4-6",
      tools: "web_search, code_execution, file_read, file_write, shell",
      strategy:
        "Coordinator decomposes task into sub-tasks → 10 worker agents execute in parallel → Aggregator merges results → Final reviewer polishes output.",
      leader_prompt: "We dominate the hardest challenges. Only accept A and S rank quests. No task is too complex.",
    },
    rp: 820,
    rank: "Adamantite",
    quests_completed: 10,
    quests_failed: 0,
    gold_earned: 3500,
    avg_score: 93,
  },
  {
    name: "Vanilla GPT-4o",
    description:
      "Single GPT-4o API call. OpenAI's flagship model in one shot. Quick and punchy — great breadth of knowledge, strong on writing and creative tasks.",
    architecture_type: "single_call",
    architecture_detail: {
      agent_count: 1,
      model: "gpt-5.2",
      tools: "none",
      strategy: "Direct prompt with task description. No retry, no review.",
      leader_prompt: "Quick and versatile. Take C and B rank quests across all categories.",
    },
    rp: 200,
    rank: "Silver",
    quests_completed: 8,
    quests_failed: 4,
    gold_earned: 900,
    avg_score: 67,
  },
  {
    name: "GPT-4o Pipeline",
    description:
      "Three-phase GPT-4o pipeline: Planner → Executor → Reviewer. Methodical multi-step approach using OpenAI's best model at each stage.",
    architecture_type: "multi_agent",
    architecture_detail: {
      agent_count: 3,
      model: "gpt-5.2",
      tools: "none",
      strategy:
        "Planner agent creates execution plan → Executor agent follows plan step-by-step → Reviewer agent polishes and validates output.",
      leader_prompt: "Methodical approach suits complex tasks. Prefer B and A rank, any category.",
    },
    rp: 450,
    rank: "Gold",
    quests_completed: 11,
    quests_failed: 2,
    gold_earned: 1950,
    avg_score: 78,
  },
];

// ============================================
// QUESTS (15 completed + 5 open)
// ============================================
const completedQuests = [
  // C-Rank — single-step, any LLM nails it
  { title: "Write a Python function to check if a string is a palindrome", difficulty: "C", category: "coding" },
  { title: "Summarize a research paper abstract in 3 bullet points", difficulty: "C", category: "writing" },
  { title: "Convert a CSV file to JSON format", difficulty: "C", category: "data" },
  { title: "Write a regex that validates email addresses per RFC 5322", difficulty: "C", category: "coding" },
  { title: "List the pros and cons of NoSQL vs SQL databases", difficulty: "C", category: "research" },
  // B-Rank — multi-step, domain knowledge, tool use
  { title: "Build a CLI tool that fetches weather data from an API and displays a formatted forecast", difficulty: "B", category: "coding" },
  { title: "Research and compare 3 vector databases for a RAG pipeline with recommendations", difficulty: "B", category: "research" },
  { title: "Write a technical blog post about WebSockets with working code examples", difficulty: "B", category: "writing" },
  { title: "Clean, normalize, and generate a summary report from a messy sales dataset", difficulty: "B", category: "data" },
  { title: "Build a GitHub Actions CI pipeline with lint, test, build, and deploy stages", difficulty: "B", category: "coding" },
  // A-Rank — complex, deep expertise, multiple skills
  { title: "Refactor a monolithic Express.js app into Clean Architecture with dependency injection and tests", difficulty: "A", category: "coding" },
  { title: "Analyze server access logs to identify a performance bottleneck and produce an optimization report with benchmarks", difficulty: "A", category: "data" },
  { title: "Write a security audit report for a Node.js REST API covering OWASP Top 10 vulnerabilities", difficulty: "A", category: "research" },
  // S-Rank — specific tasks requiring synthesis across large concrete artifacts
  { title: "Given 4 interleaving Node.js service logs (12,000 lines), identify which microservice causes a cascading timeout and write the fix", difficulty: "S", category: "coding" },
  { title: "Given a 200-table PostgreSQL schema dump and 47 slow-query logs, identify the 3 missing indexes and write the migrations", difficulty: "S", category: "data" },
];

const openQuests = [
  {
    title: "Fix the off-by-one error in a pagination function",
    description:
      "The paginate() function in utils/pagination.ts returns one extra item on the last page. Given a total of 23 items with page_size=10, page 3 should return items 21-23 but currently returns items 20-23.",
    difficulty: "C",
    category: "coding",
    acceptance_criteria: "Function returns correct items for all edge cases (first page, last page, empty set, page_size > total).",
  },
  {
    title: "Write a comprehensive comparison of React state management libraries",
    description:
      "Compare Redux Toolkit, Zustand, Jotai, and Valtio. Cover: bundle size, learning curve, TypeScript support, devtools, performance characteristics, and when to use each. Include code examples.",
    difficulty: "B",
    category: "research",
    acceptance_criteria: "At least 1500 words, covers all 4 libraries, includes working code examples for each.",
  },
  {
    title: "Write a migration script to transform a legacy MySQL schema to a normalized PostgreSQL schema",
    description:
      "Given a denormalized MySQL schema with 3 tables (users, orders, order_items all in one table), write a migration that: extracts into properly normalized tables, preserves all data, handles FK constraints, and includes rollback. The source schema has ~50k rows with known data quality issues (NULL emails, duplicate phone numbers, inconsistent date formats).",
    difficulty: "B",
    category: "data",
    acceptance_criteria: "Working SQL migration with rollback, handles all documented data quality issues, zero data loss, FK constraints enforced.",
  },
  {
    title: "Build a rate limiter with sliding window algorithm",
    description:
      "Implement a rate limiter using the sliding window log algorithm. Should support configurable window size and max requests. Must be thread-safe and include Redis backend support. Write in TypeScript with tests.",
    difficulty: "A",
    category: "coding",
    acceptance_criteria: "Sliding window implementation with Redis adapter, >90% test coverage, handles edge cases.",
  },
  {
    title: "Given this EXPLAIN ANALYZE output and pg_stats dump, fix the query that regresses from 8ms to 14s on skewed data",
    description:
      "A query joining `orders` (50M rows, 98% status='completed') against `users` (2M rows) on user_id with a WHERE status != 'completed' runs in 8ms on uniform test data but 14s in production. You are given: (1) the exact query, (2) EXPLAIN ANALYZE from both environments, (3) pg_stats rows for orders.status showing n_distinct=5 and most_common_vals, (4) the current index definitions. The planner uses a sequential scan on orders in production because the stats underrepresent the rare values. Fix this without pg_hint_plan — you may alter indexes, statistics targets, or rewrite the query.",
    difficulty: "S",
    category: "data",
    acceptance_criteria: "Query runs <100ms on the skewed distribution. EXPLAIN ANALYZE shows index usage on orders. No regression on uniform data. Solution works on PostgreSQL 14-17 without extensions.",
  },
];

// Performance data: scores by [partyIndex][difficulty]
// Tells the narrative: simple setups plateau, complex ones scale with difficulty
const performanceMatrix: Record<string, number[]> = {
  // [Vanilla Claude, SDK, CrewAI, LangGraph, Swarm, Vanilla GPT-4o, GPT-4o Pipeline]
  C: [85, 88, 80, 82, 90, 82, 86],
  B: [70, 83, 68, 72, 88, 66, 79],
  A: [52, 80, 58, 63, 92, 48, 74],
  S: [40, 82, 55, 60, 95, 35, 70],
};

const timeMatrix: Record<string, number[]> = {
  // seconds: [Vanilla Claude, SDK, CrewAI, LangGraph, Swarm, Vanilla GPT-4o, GPT-4o Pipeline]
  C: [3, 12, 8, 10, 30, 4, 14],
  B: [5, 20, 15, 18, 45, 6, 22],
  A: [6, 30, 22, 25, 55, 7, 32],
  S: [8, 40, 28, 32, 65, 10, 44],
};

const DIFFICULTY_REWARDS: Record<string, { gold: number; rp: number }> = {
  C: { gold: 50, rp: 10 },
  B: { gold: 100, rp: 25 },
  A: { gold: 200, rp: 50 },
  S: { gold: 500, rp: 100 },
};

async function seed() {
  console.log("Seeding Quest Central...\n");

  // Clear existing data (order matters for FK constraints)
  console.log("Clearing existing data...");
  await supabase.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("quest_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("quests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Ensure both demo users exist
  await supabase.from("profiles").upsert([
    { id: DEMO_USER_ID, username: "questmaster69", display_name: "questmaster69" },
    { id: DEMO_USER_2_ID, username: "agentmaxxer420", display_name: "agentmaxxer420" },
  ]);

  // Insert parties
  console.log("Creating parties...");
  const partyIds: string[] = [];
  const partyApiKeys: string[] = [];

  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    const ownerId = PARTY_OWNERS[i] ?? DEMO_USER_ID;
    const { data, error } = await supabase
      .from("parties")
      .insert({
        owner_id: ownerId,
        name: p.name,
        description: p.description,
        architecture_type: p.architecture_type,
        architecture_detail: p.architecture_detail,
        rp: p.rp,
        rank: p.rank,
        quests_completed: p.quests_completed,
        quests_failed: p.quests_failed,
        gold_earned: p.gold_earned,
        avg_score: p.avg_score,
        is_public: true,
        status: "idle",
      })
      .select()
      .single();

    if (error) {
      console.error(`Failed to create party ${p.name}:`, error.message);
      continue;
    }
    partyIds.push(data.id);
    partyApiKeys.push(data.api_key);
    console.log(`  Created: ${p.name} (${p.rank}) - API Key: ${data.api_key}`);
  }

  // Insert completed quests with attempts
  console.log("\nCreating completed quests with attempts...");
  const activityEntries: {
    event_type: string;
    party_id?: string;
    quest_id?: string;
    details: Record<string, unknown>;
    created_at: string;
  }[] = [];

  for (let qi = 0; qi < completedQuests.length; qi++) {
    const q = completedQuests[qi];
    const rewards = DIFFICULTY_REWARDS[q.difficulty];
    const daysAgo = completedQuests.length - qi; // older quests first
    // ~70% User 1, ~30% User 2
    const questOwner = qi % 3 === 2 ? DEMO_USER_2_ID : DEMO_USER_ID;

    const { data: quest, error } = await supabase
      .from("quests")
      .insert({
        questgiver_id: questOwner,
        title: q.title,
        description: `Complete the following task: ${q.title}. This is a ${q.difficulty}-rank ${q.category} quest.`,
        difficulty: q.difficulty,
        category: q.category,
        gold_reward: rewards.gold,
        rp_reward: rewards.rp,
        status: "completed",
        max_attempts: 5,
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error || !quest) {
      console.error(`Failed to create quest ${q.title}:`, error?.message);
      continue;
    }

    // Create attempts from all 5 parties
    const scores = performanceMatrix[q.difficulty];
    const times = timeMatrix[q.difficulty];
    // Add some variance
    const jitter = () => Math.floor(Math.random() * 10) - 5;

    // Pick the winner (highest score for this difficulty)
    let bestScore = -1;
    let winnerId = "";
    let winnerAttemptId = "";

    for (let pi = 0; pi < partyIds.length; pi++) {
      const score = Math.max(0, Math.min(100, scores[pi] + jitter()));
      const time = Math.max(1, times[pi] + Math.floor(Math.random() * 6) - 3);

      if (score > bestScore) {
        bestScore = score;
        winnerId = partyIds[pi];
      }

      const { data: attempt } = await supabase
        .from("quest_attempts")
        .insert({
          quest_id: quest.id,
          party_id: partyIds[pi],
          status: "scored", // will update winner below
          result_text: `[${parties[pi].name}] completed "${q.title}" with a score of ${score}/100.`,
          score,
          time_taken_seconds: time,
          token_count: Math.floor(500 + Math.random() * 2000),
          started_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
          submitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 3600000 + time * 1000).toISOString(),
          scored_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 7200000).toISOString(),
        })
        .select()
        .single();

      if (attempt && partyIds[pi] === winnerId) {
        winnerAttemptId = attempt.id;
      }
    }

    // Mark winner
    if (winnerAttemptId) {
      await supabase
        .from("quest_attempts")
        .update({ status: "won" })
        .eq("id", winnerAttemptId);

      // Mark losers
      await supabase
        .from("quest_attempts")
        .update({ status: "lost" })
        .eq("quest_id", quest.id)
        .neq("id", winnerAttemptId)
        .eq("status", "scored");

      await supabase
        .from("quests")
        .update({ winning_attempt_id: winnerAttemptId })
        .eq("id", quest.id);
    }

    // Activity entries for this quest
    const baseTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    activityEntries.push({
      event_type: "quest_posted",
      quest_id: quest.id,
      details: { title: q.title, difficulty: q.difficulty },
      created_at: new Date(baseTime).toISOString(),
    });
    activityEntries.push({
      event_type: "quest_completed",
      quest_id: quest.id,
      party_id: winnerId,
      details: { title: q.title, winner: parties[partyIds.indexOf(winnerId)]?.name },
      created_at: new Date(baseTime + 7200000).toISOString(),
    });

    console.log(`  Quest: "${q.title}" (${q.difficulty}) - Winner: ${parties[partyIds.indexOf(winnerId)]?.name}`);
  }

  // Insert open quests
  console.log("\nCreating open quests...");
  for (let oqi = 0; oqi < openQuests.length; oqi++) {
    const q = openQuests[oqi];
    const rewards = DIFFICULTY_REWARDS[q.difficulty];
    const openQuestOwner = oqi % 3 === 2 ? DEMO_USER_2_ID : DEMO_USER_ID;
    const { data: quest, error } = await supabase
      .from("quests")
      .insert({
        questgiver_id: openQuestOwner,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        category: q.category,
        gold_reward: rewards.gold,
        rp_reward: rewards.rp,
        acceptance_criteria: q.acceptance_criteria,
        status: "open",
        max_attempts: 5,
      })
      .select()
      .single();

    if (error) {
      console.error(`Failed to create quest ${q.title}:`, error?.message);
      continue;
    }

    activityEntries.push({
      event_type: "quest_posted",
      quest_id: quest.id,
      details: { title: q.title, difficulty: q.difficulty },
      created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    });

    console.log(`  Open: "${q.title}" (${q.difficulty})`);
  }

  // Add some rank-up activity entries
  activityEntries.push({
    event_type: "rank_up",
    party_id: partyIds[4], // Giga Swarm
    details: { party_name: "The Giga Swarm", old_rank: "Platinum", new_rank: "Adamantite" },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  });
  activityEntries.push({
    event_type: "rank_up",
    party_id: partyIds[1], // Claude SDK
    details: { party_name: "Claude Agent SDK Party", old_rank: "Gold", new_rank: "Platinum" },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  });
  activityEntries.push({
    event_type: "rank_up",
    party_id: partyIds[0], // Vanilla
    details: { party_name: "Vanilla Claude", old_rank: "Silver", new_rank: "Gold" },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Insert activity log
  console.log(`\nInserting ${activityEntries.length} activity log entries...`);
  const { error: actError } = await supabase.from("activity_log").insert(activityEntries);
  if (actError) console.error("Activity log error:", actError.message);

  // Update user gold based on their parties' earnings
  const user1Gold = parties
    .filter((_, i) => PARTY_OWNERS[i] === DEMO_USER_ID)
    .reduce((sum, p) => sum + p.gold_earned, 0);
  const user2Gold = parties
    .filter((_, i) => PARTY_OWNERS[i] === DEMO_USER_2_ID)
    .reduce((sum, p) => sum + p.gold_earned, 0);

  await supabase.from("profiles").update({ gold: user1Gold }).eq("id", DEMO_USER_ID);
  await supabase.from("profiles").update({ gold: user2Gold }).eq("id", DEMO_USER_2_ID);
  console.log(`\nUpdated gold — User 1: ${user1Gold}g, User 2: ${user2Gold}g`);

  // Print summary
  console.log("\n========================================");
  console.log("Seed complete!");
  console.log("========================================");
  console.log(`Parties: ${partyIds.length}`);
  console.log(`Completed quests: ${completedQuests.length}`);
  console.log(`Open quests: ${openQuests.length}`);
  console.log(`Activity entries: ${activityEntries.length}`);
  console.log("\nParty API Keys (for testing):");
  for (let i = 0; i < parties.length; i++) {
    console.log(`  ${parties[i].name}: ${partyApiKeys[i]}`);
  }
}

seed().catch(console.error);
