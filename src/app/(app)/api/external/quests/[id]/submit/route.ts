import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { scoreAttempt } from "@/lib/oracle";
import { calculateRewards, determineRank } from "@/lib/rewards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { party, error } = await authenticateParty(request);
  if (!party) return NextResponse.json({ error }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();
  const body = await request.json();

  // Find the party's active attempt on this quest
  const { data: attempt } = await supabase
    .from("quest_attempts")
    .select("*")
    .eq("quest_id", id)
    .eq("party_id", party.id)
    .eq("status", "in_progress")
    .single();

  if (!attempt) {
    return NextResponse.json(
      { error: "No active attempt found for this quest" },
      { status: 404 }
    );
  }

  const now = new Date();
  const startedAt = new Date(attempt.started_at);
  const timeTaken = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  // Update the attempt to submitted
  const { data: updated, error: updateError } = await supabase
    .from("quest_attempts")
    .update({
      status: "submitted",
      result_text: body.result_text || null,
      result_data: body.result_data || null,
      token_count: body.token_count || null,
      time_taken_seconds: timeTaken,
      submitted_at: now.toISOString(),
    })
    .eq("id", attempt.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fetch quest details for scoring
  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .single();

  // Update party status back to idle
  await supabase
    .from("parties")
    .update({ status: "idle" })
    .eq("id", party.id);

  // Log submission activity
  await supabase.from("activity_log").insert({
    event_type: "quest_submitted",
    party_id: party.id,
    quest_id: id,
    details: {
      party_name: party.name,
      quest_title: quest?.title,
      time_taken_seconds: timeTaken,
    },
  });

  // ─── Oracle Auto-Scoring (fire-and-forget) ───
  // Score async so the agent gets a fast response
  if (quest && body.result_text) {
    scoreAndReward(
      supabase,
      attempt.id,
      party.id,
      quest,
      body.result_text
    ).catch((err) => console.error("[Oracle] Scoring error:", err));
  }

  return NextResponse.json(updated);
}

/**
 * Score the attempt via the Oracle, distribute rewards, and update party stats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scoreAndReward(
  supabase: any,
  attemptId: string,
  partyId: string,
  quest: { id: string; title: string; description: string; acceptance_criteria: string | null; difficulty: string; gold_reward: number },
  resultText: string
) {
  // 1. Score via Oracle
  const verdict = await scoreAttempt(
    quest.title,
    quest.description,
    quest.acceptance_criteria,
    quest.difficulty,
    resultText
  );

  console.log(`[Oracle] Scored attempt ${attemptId.slice(0, 8)}: ${verdict.score}/100 — ${verdict.feedback}`);

  // 2. Update attempt with score
  await supabase
    .from("quest_attempts")
    .update({
      status: "scored",
      score: verdict.score,
      questgiver_feedback: verdict.feedback,
      scored_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  // 3. Calculate rewards (passing score = 50+)
  const isWinner = verdict.score >= 70;
  const rewards = calculateRewards(quest.difficulty, verdict.score, isWinner);

  // 4. Update party stats
  const { data: currentParty } = await supabase
    .from("parties")
    .select("rp, gold_earned, quests_completed, quests_failed, avg_score")
    .eq("id", partyId)
    .single();

  if (currentParty) {
    const totalCompleted = currentParty.quests_completed + (verdict.score >= 50 ? 1 : 0);
    const totalFailed = currentParty.quests_failed + (verdict.score < 50 ? 1 : 0);
    const newRp = currentParty.rp + rewards.rp;
    const newGold = currentParty.gold_earned + rewards.gold;
    // Running average score
    const totalAttempts = currentParty.quests_completed + currentParty.quests_failed;
    const newAvg = totalAttempts > 0
      ? Math.round(((currentParty.avg_score * totalAttempts) + verdict.score) / (totalAttempts + 1))
      : verdict.score;
    const newRank = determineRank(newRp);

    await supabase
      .from("parties")
      .update({
        rp: newRp,
        gold_earned: newGold,
        quests_completed: totalCompleted,
        quests_failed: totalFailed,
        avg_score: newAvg,
        rank: newRank,
      })
      .eq("id", partyId);

    // Log rank up if it changed
    if (newRank !== determineRank(currentParty.rp)) {
      await supabase.from("activity_log").insert({
        event_type: "rank_up",
        party_id: partyId,
        details: {
          old_rank: determineRank(currentParty.rp),
          new_rank: newRank,
          rp: newRp,
        },
      });
    }
  }

  // 5. Log scored activity
  await supabase.from("activity_log").insert({
    event_type: "quest_scored",
    party_id: partyId,
    quest_id: quest.id,
    details: {
      score: verdict.score,
      feedback: verdict.feedback,
      gold_earned: rewards.gold,
      rp_earned: rewards.rp,
    },
  });

  // 6. Check if all attempts for this quest are scored → pick winner
  const { data: allAttempts } = await supabase
    .from("quest_attempts")
    .select("id, score, party_id, status")
    .eq("quest_id", quest.id)
    .in("status", ["scored"]);

  const { count: pendingCount } = await supabase
    .from("quest_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", quest.id)
    .in("status", ["in_progress", "submitted"]);

  if ((pendingCount ?? 0) === 0 && allAttempts && allAttempts.length > 0) {
    // All done — pick the highest scorer as winner
    const sorted = [...allAttempts].sort((a: { score: number }, b: { score: number }) => (b.score ?? 0) - (a.score ?? 0));
    const winner = sorted[0];

    // Mark winner
    await supabase
      .from("quest_attempts")
      .update({ status: "won" })
      .eq("id", winner.id);

    // Mark losers
    const loserIds = sorted.slice(1).map((a: { id: string }) => a.id);
    if (loserIds.length > 0) {
      await supabase
        .from("quest_attempts")
        .update({ status: "lost" })
        .in("id", loserIds);
    }

    // Complete the quest
    await supabase
      .from("quests")
      .update({
        status: "completed",
        winning_attempt_id: winner.id,
      })
      .eq("id", quest.id);

    // Log quest completion
    await supabase.from("activity_log").insert({
      event_type: "quest_completed",
      quest_id: quest.id,
      party_id: winner.party_id,
      details: {
        quest_title: quest.title,
        winning_score: winner.score,
      },
    });
  }
}
