import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || 20;

  const { data, error } = await supabase
    .from("activity_log")
    .select("*, party:parties(name), quest:quests(title)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
