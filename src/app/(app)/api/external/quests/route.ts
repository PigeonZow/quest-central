import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { party, error } = await authenticateParty(request);
  if (!party) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createServiceClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("quests")
    .select("id, title, description, difficulty, category, gold_reward, rp_reward, status, max_attempts, time_limit_minutes, acceptance_criteria, created_at")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  const difficulty = searchParams.get("difficulty");
  if (difficulty) {
    const diffs = difficulty.split(",");
    query = query.in("difficulty", diffs);
  }

  const category = searchParams.get("category");
  if (category) query = query.eq("category", category);

  const { data: quests, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Enrich quests with competitive intel and filter out already-attempted quests
  const questIds = (quests ?? []).map((q) => q.id);
  let attemptCounts: Record<string, number> = {};
  const alreadyAttempted = new Set<string>();

  if (questIds.length > 0) {
    const { data: attempts } = await supabase
      .from("quest_attempts")
      .select("quest_id, party_id")
      .in("quest_id", questIds);

    if (attempts) {
      for (const a of attempts) {
        attemptCounts[a.quest_id] = (attemptCounts[a.quest_id] ?? 0) + 1;
        if (a.party_id === party.id) {
          alreadyAttempted.add(a.quest_id);
        }
      }
    }
  }

  const enriched = (quests ?? [])
    .filter((q) => !alreadyAttempted.has(q.id))
    .map((q) => ({
      ...q,
      current_attempts: attemptCounts[q.id] ?? 0,
      slots_remaining: q.max_attempts - (attemptCounts[q.id] ?? 0),
    }));

  return NextResponse.json(enriched);
}
