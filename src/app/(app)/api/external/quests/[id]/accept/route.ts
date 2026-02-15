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

  // Check quest exists and is open
  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .single();

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.status !== "open" && quest.status !== "in_progress") {
    return NextResponse.json(
      { error: "Quest is not available for acceptance" },
      { status: 400 }
    );
  }

  // Check if this party already attempted this quest
  const { count: partyAttemptCount } = await supabase
    .from("quest_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", id)
    .eq("party_id", party.id);

  if ((partyAttemptCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "Party has already attempted this quest" },
      { status: 409 }
    );
  }

  // Check max attempts
  const { count } = await supabase
    .from("quest_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", id);

  if ((count ?? 0) >= quest.max_attempts) {
    return NextResponse.json(
      { error: "Quest has reached maximum attempts" },
      { status: 400 }
    );
  }

  // Create attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("quest_attempts")
    .insert({
      quest_id: id,
      party_id: party.id,
      status: "in_progress",
    })
    .select()
    .single();

  if (attemptError) {
    if (attemptError.code === "23505") {
      return NextResponse.json(
        { error: "Party already has an active attempt on this quest" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  // Update party status
  await supabase
    .from("parties")
    .update({ status: "active" })
    .eq("id", party.id);

  // Update quest status if needed
  if (quest.status === "open") {
    await supabase
      .from("quests")
      .update({ status: "in_progress" })
      .eq("id", id);
  }

  // Log activity
  await supabase.from("activity_log").insert({
    event_type: "quest_accepted",
    party_id: party.id,
    quest_id: id,
    details: { party_name: party.name, quest_title: quest.title },
  });

  return NextResponse.json({
    attempt_id: attempt.id,
    quest_id: id,
    status: attempt.status,
    started_at: attempt.started_at,
  }, { status: 201 });
}
