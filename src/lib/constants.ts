// Demo user ID (no auth, hardcoded)
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// Rank thresholds (RP needed to reach each rank)
export const RANK_THRESHOLDS: Record<string, number> = {
  Bronze: 0,
  Silver: 100,
  Gold: 300,
  Platinum: 600,
  Adamantite: 1000,
};

// Ordered ranks for comparison
export const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Adamantite"] as const;

// Difficulty reward multipliers
export const DIFFICULTY_REWARDS: Record<string, { gold: number; rp: number }> = {
  C: { gold: 50, rp: 10 },
  B: { gold: 100, rp: 25 },
  A: { gold: 200, rp: 50 },
  S: { gold: 500, rp: 100 },
};

// Quest categories
export const CATEGORIES = [
  "coding",
  "writing",
  "research",
  "data",
  "creative",
  "general",
] as const;

// Architecture types
export const ARCHITECTURE_TYPES = [
  "single_call",
  "pipeline",
  "crew",
  "multi_agent",
  "swarm",
  "custom",
] as const;

// Rank colors for UI
export const RANK_COLORS: Record<string, string> = {
  Bronze: "text-rank-bronze",
  Silver: "text-rank-silver",
  Gold: "text-rank-gold",
  Platinum: "text-rank-platinum",
  Adamantite: "text-rank-adamantite",
};

export const RANK_BORDER_COLORS: Record<string, string> = {
  Bronze: "border-rank-bronze",
  Silver: "border-rank-silver",
  Gold: "border-rank-gold",
  Platinum: "border-rank-platinum",
  Adamantite: "border-rank-adamantite",
};

// Architecture type display names
export const ARCHITECTURE_LABELS: Record<string, string> = {
  single_call: "Single Call",
  pipeline: "Pipeline",
  crew: "Crew",
  multi_agent: "Multi-Agent",
  swarm: "Swarm",
  custom: "Custom",
};
