import { DIFFICULTY_REWARDS, RANKS, RANK_THRESHOLDS } from "./constants";

export function calculateRewards(
  difficulty: string,
  score: number,
  isWinner: boolean
) {
  const base = DIFFICULTY_REWARDS[difficulty] ?? DIFFICULTY_REWARDS.C;
  if (isWinner) {
    return { gold: base.gold, rp: base.rp };
  }
  // Losers get partial RP based on score, no gold
  return { gold: 0, rp: Math.floor(base.rp * (score / 100) * 0.3) };
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
