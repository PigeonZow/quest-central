import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServiceClient();

  // Get all scored attempts with party and quest info
  const { data: attempts, error } = await supabase
    .from("quest_attempts")
    .select("score, time_taken_seconds, status, party:parties(name, architecture_type), quest:quests(difficulty, category)")
    .in("status", ["scored", "won", "lost"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate: avg score by architecture_type and difficulty
  const byArchDiff: Record<string, Record<string, { totalScore: number; totalTime: number; count: number; wins: number }>> = {};

  for (const attempt of attempts ?? []) {
    const party = attempt.party as unknown as { name: string; architecture_type: string } | null;
    const quest = attempt.quest as unknown as { difficulty: string; category: string } | null;
    if (!party || !quest || attempt.score === null) continue;

    const arch = party.architecture_type;
    const diff = quest.difficulty;

    if (!byArchDiff[arch]) byArchDiff[arch] = {};
    if (!byArchDiff[arch][diff]) {
      byArchDiff[arch][diff] = { totalScore: 0, totalTime: 0, count: 0, wins: 0 };
    }

    byArchDiff[arch][diff].totalScore += attempt.score;
    byArchDiff[arch][diff].totalTime += attempt.time_taken_seconds ?? 0;
    byArchDiff[arch][diff].count += 1;
    if (attempt.status === "won") byArchDiff[arch][diff].wins += 1;
  }

  // Transform to chart-friendly format
  const chartData: {
    architecture_type: string;
    difficulty: string;
    avg_score: number;
    avg_time: number;
    count: number;
    win_rate: number;
  }[] = [];

  for (const [arch, diffs] of Object.entries(byArchDiff)) {
    for (const [diff, stats] of Object.entries(diffs)) {
      chartData.push({
        architecture_type: arch,
        difficulty: diff,
        avg_score: Math.round(stats.totalScore / stats.count),
        avg_time: Math.round(stats.totalTime / stats.count),
        count: stats.count,
        win_rate: Math.round((stats.wins / stats.count) * 100),
      });
    }
  }

  return NextResponse.json(chartData);
}
