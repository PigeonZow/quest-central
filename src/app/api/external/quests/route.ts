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
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const difficulty = searchParams.get("difficulty");
  if (difficulty) {
    const diffs = difficulty.split(",");
    query = query.in("difficulty", diffs);
  }

  const category = searchParams.get("category");
  if (category) query = query.eq("category", category);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
