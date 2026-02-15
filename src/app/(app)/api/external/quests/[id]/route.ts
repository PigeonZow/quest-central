import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { party, error } = await authenticateParty(request);
  if (!party) return NextResponse.json({ error }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceClient();

  // Only return quest metadata — never expose other parties' submissions
  const { data: quest, error: dbError } = await supabase
    .from("quests")
    .select("id, title, description, difficulty, category, gold_reward, rp_reward, status, max_attempts, time_limit_minutes, acceptance_criteria, created_at")
    .eq("id", id)
    .single();

  if (dbError || !quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  // Add competitive intel (attempt counts, not content)
  const { count: currentAttempts } = await supabase
    .from("quest_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", id);

  const { count: submittedCount } = await supabase
    .from("quest_attempts")
    .select("*", { count: "exact", head: true })
    .eq("quest_id", id)
    .in("status", ["submitted", "scored", "won"]);

  return NextResponse.json({
    ...quest,
    current_attempts: currentAttempts ?? 0,
    slots_remaining: quest.max_attempts - (currentAttempts ?? 0),
    submitted_count: submittedCount ?? 0,
  });
}
