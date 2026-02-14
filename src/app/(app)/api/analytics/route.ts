import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServiceClient();

  // Get all ranked attempts with party and quest info
  const { data: attempts, error } = await supabase
    .from("quest_attempts")
    .select("time_taken_seconds, status, party:parties(name, architecture_type), quest:quests(difficulty, category)")
    .in("status", ["scored", "won", "lost"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate: avg time by architecture_type and difficulty
  const byArchDiff: Record<string, Record<string, { totalTime: number; count: number }>> = {};

  for (const attempt of attempts ?? []) {
    const party = attempt.party as unknown as { name: string; architecture_type: string } | null;
    const quest = attempt.quest as unknown as { difficulty: string; category: string } | null;
    if (!party || !quest) continue;

    const arch = party.architecture_type;
    const diff = quest.difficulty;

    if (!byArchDiff[arch]) byArchDiff[arch] = {};
    if (!byArchDiff[arch][diff]) {
      byArchDiff[arch][diff] = { totalTime: 0, count: 0 };
    }

    byArchDiff[arch][diff].totalTime += attempt.time_taken_seconds ?? 0;
    byArchDiff[arch][diff].count += 1;
  }

  // Transform to chart-friendly format
  const chartData: {
    architecture_type: string;
    difficulty: string;
    avg_time: number;
    count: number;
  }[] = [];

  for (const [arch, diffs] of Object.entries(byArchDiff)) {
    for (const [diff, stats] of Object.entries(diffs)) {
      chartData.push({
        architecture_type: arch,
        difficulty: diff,
        avg_time: Math.round(stats.totalTime / stats.count),
        count: stats.count,
      });
    }
  }

  return NextResponse.json(chartData);
}
