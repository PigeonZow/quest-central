import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { evaluateAttempt, rankAttempts } from "@/lib/oracle";
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

  // Fetch quest details
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

  // ─── Oracle Auto-Evaluation (fire-and-forget) ───
  // Evaluate async so the agent gets a fast response
  if (quest && body.result_text) {
    evaluateAndRank(
      supabase,
      attempt.id,
      party.id,
      quest,
      body.result_text
    ).catch((err) => console.error("[Oracle] Evaluation error:", err));
  }

  return NextResponse.json(updated);
}

/**
 * Evaluate the attempt via the Oracle. When all attempts for a quest are
 * submitted, rank them and distribute rewards.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evaluateAndRank(
  supabase: any,
  attemptId: string,
  partyId: string,
  quest: { id: string; title: string; description: string; acceptance_criteria: string | null; difficulty: string; gold_reward: number },
  resultText: string
) {
  // 1. Evaluate via Oracle (get feedback, no numeric score)
  const verdict = await evaluateAttempt(
    quest.title,
    quest.description,
    quest.acceptance_criteria,
    quest.difficulty,
    resultText
  );

  console.log(`[Oracle] Evaluated attempt ${attemptId.slice(0, 8)}: ${verdict.feedback}`);

  // 2. Update attempt with Oracle feedback
  await supabase
    .from("quest_attempts")
    .update({
      status: "scored",
      questgiver_feedback: verdict.feedback,
      scored_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  // 3. Log evaluation activity
  await supabase.from("activity_log").insert({
    event_type: "quest_scored",
    party_id: partyId,
    quest_id: quest.id,
    details: {
      feedback: verdict.feedback,
    },
  });

  // 4. Check if all attempts for this quest are evaluated → rank them
  const { data: allAttempts } = await supabase
    .from("quest_attempts")
    .select("id, result_text, party_id, status")
    .eq("quest_id", quest.id)
    .in("status", ["scored"]);

  const { count: pendingCount } = await supabase
    .from("quest_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", quest.id)
    .in("status", ["in_progress", "submitted"]);

  if ((pendingCount ?? 0) === 0 && allAttempts && allAttempts.length > 0) {
    // All done — Oracle ranks all attempts
    const rankedOrder = await rankAttempts(
      quest.title,
      quest.description,
      quest.acceptance_criteria,
      allAttempts.map((a: { id: string; result_text: string }) => ({
        id: a.id,
        result_text: a.result_text,
      }))
    );

    for (let i = 0; i < rankedOrder.length; i++) {
      const entry = rankedOrder[i];
      const ranking = i + 1;
      const isWinner = ranking === 1;

      // Update attempt with ranking and status
      await supabase
        .from("quest_attempts")
        .update({
          ranking,
          status: isWinner ? "won" : "lost",
        })
        .eq("id", entry.id);

      // Get party and distribute rewards
      const matchingAttempt = allAttempts.find((a: { id: string }) => a.id === entry.id);
      if (!matchingAttempt) continue;

      const rewards = calculateRewards(quest.gold_reward, quest.difficulty, ranking);

      const { data: currentParty } = await supabase
        .from("parties")
        .select("rp, gold_earned, quests_completed, quests_failed")
        .eq("id", matchingAttempt.party_id)
        .single();

      if (currentParty) {
        const newRp = currentParty.rp + rewards.rp;
        const newGold = currentParty.gold_earned + rewards.gold;
        const newCompleted = currentParty.quests_completed + (isWinner ? 1 : 0);
        const newFailed = currentParty.quests_failed + (isWinner ? 0 : 1);
        const newRank = determineRank(newRp);

        await supabase
          .from("parties")
          .update({
            rp: newRp,
            gold_earned: newGold,
            quests_completed: newCompleted,
            quests_failed: newFailed,
            rank: newRank,
          })
          .eq("id", matchingAttempt.party_id);

        // Log rank up if changed
        if (newRank !== determineRank(currentParty.rp)) {
          await supabase.from("activity_log").insert({
            event_type: "rank_up",
            party_id: matchingAttempt.party_id,
            details: {
              old_rank: determineRank(currentParty.rp),
              new_rank: newRank,
              rp: newRp,
            },
          });
        }
      }
    }

    // Complete the quest
    const winnerId = rankedOrder[0]?.id;
    await supabase
      .from("quests")
      .update({
        status: "completed",
        winning_attempt_id: winnerId,
      })
      .eq("id", quest.id);

    // Log quest completion
    const winnerAttempt = allAttempts.find((a: { id: string }) => a.id === winnerId);
    await supabase.from("activity_log").insert({
      event_type: "quest_completed",
      quest_id: quest.id,
      party_id: winnerAttempt?.party_id,
      details: {
        quest_title: quest.title,
        winner_attempt_id: winnerId,
      },
    });
  }
}
