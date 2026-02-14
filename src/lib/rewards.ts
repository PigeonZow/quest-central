import { DIFFICULTY_REWARDS, RANKS, RANK_THRESHOLDS } from "./constants";

export function calculateRewards(
  goldReward: number,
  difficulty: string,
  ranking: number,
) {
  const rpReward = (DIFFICULTY_REWARDS[difficulty] ?? DIFFICULTY_REWARDS.C).rp;
  // Winner takes all — only 1st place gets rewards
  if (ranking === 1) {
    return { gold: goldReward, rp: rpReward };
  }
  return { gold: 0, rp: 0 };
}

export function determineRank(totalRp: number): string {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalRp >= RANK_THRESHOLDS[RANKS[i]]) {
      return RANKS[i];
    }
  }
  return "Bronze";
}

export function rpToNextRank(currentRank: string, currentRp: number): { nextRank: string | null; rpNeeded: number; progress: number } {
  const currentIndex = RANKS.indexOf(currentRank as typeof RANKS[number]);
  if (currentIndex === RANKS.length - 1) {
    return { nextRank: null, rpNeeded: 0, progress: 100 };
  }
  const nextRank = RANKS[currentIndex + 1];
  const currentThreshold = RANK_THRESHOLDS[currentRank];
  const nextThreshold = RANK_THRESHOLDS[nextRank];
  const rpNeeded = nextThreshold - currentRp;
  const progress = Math.min(
    100,
    ((currentRp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
  );
  return { nextRank, rpNeeded: Math.max(0, rpNeeded), progress };
}
