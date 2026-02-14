import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateRewards, determineRank } from "@/lib/rewards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { scores, winner_id } = body as {
    scores: { attempt_id: string; score: number; feedback: string | null }[];
    winner_id: string;
  };

  // Get quest info
  const { data: quest, error: questError } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .single();

  if (questError || !quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // Score each attempt
  for (const { attempt_id, score, feedback } of scores) {
    const isWinner = attempt_id === winner_id;
    const status = isWinner ? "won" : "lost";

    // Update attempt
    await supabase
      .from("quest_attempts")
      .update({
        score,
        status,
        questgiver_feedback: feedback,
        scored_at: new Date().toISOString(),
      })
      .eq("id", attempt_id);

    // Get party for this attempt
    const { data: attempt } = await supabase
      .from("quest_attempts")
      .select("party_id")
      .eq("id", attempt_id)
      .single();

    if (!attempt) continue;

    // Calculate rewards
    const rewards = calculateRewards(quest.difficulty, score, isWinner);

    // Get current party stats
    const { data: party } = await supabase
      .from("parties")
      .select("*")
      .eq("id", attempt.party_id)
      .single();

    if (!party) continue;

    const newRp = party.rp + rewards.rp;
    const newGold = party.gold_earned + rewards.gold;
    const newCompleted = isWinner
      ? party.quests_completed + 1
      : party.quests_completed;
    const newFailed = isWinner
      ? party.quests_failed
      : party.quests_failed + 1;

    // Recalculate average score
    const totalScored = newCompleted + newFailed;
    const newAvgScore =
      totalScored > 0
        ? Number(
            (
              (party.avg_score * (totalScored - 1) + score) /
              totalScored
            ).toFixed(2)
          )
        : score;

    const newRank = determineRank(newRp);
    const rankedUp = newRank !== party.rank;

    // Update party
    await supabase
      .from("parties")
      .update({
        rp: newRp,
        gold_earned: newGold,
        rank: newRank,
        quests_completed: newCompleted,
        quests_failed: newFailed,
        avg_score: newAvgScore,
        status: "idle",
      })
      .eq("id", party.id);

    // Log rank up
    if (rankedUp) {
      await supabase.from("activity_log").insert({
        event_type: "rank_up",
        party_id: party.id,
        quest_id: id,
        details: {
          old_rank: party.rank,
          new_rank: newRank,
          party_name: party.name,
        },
      });
    }
  }

  // Update quest status
  await supabase
    .from("quests")
    .update({
      status: "completed",
      winning_attempt_id: winner_id,
    })
    .eq("id", id);

  // Log activity
  await supabase.from("activity_log").insert({
    event_type: "quest_completed",
    quest_id: id,
    details: { title: quest.title, winner_attempt_id: winner_id },
  });

  return NextResponse.json({ success: true });
}
