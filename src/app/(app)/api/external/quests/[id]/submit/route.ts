import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";
import { createServiceClient } from "@/lib/supabase/server";

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

  // Update the attempt
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

  // Update party status back to idle
  await supabase
    .from("parties")
    .update({ status: "idle" })
    .eq("id", party.id);

  // Check if all attempts are submitted -> move quest to review
  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .single();

  if (quest) {
    const { count: inProgressCount } = await supabase
      .from("quest_attempts")
      .select("*", { count: "exact", head: true })
      .eq("quest_id", id)
      .eq("status", "in_progress");

    if ((inProgressCount ?? 0) === 0) {
      await supabase
        .from("quests")
        .update({ status: "review" })
        .eq("id", id);
    }
  }

  // Log activity
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

  return NextResponse.json(updated);
}
