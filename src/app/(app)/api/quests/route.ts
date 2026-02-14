import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DIFFICULTY_REWARDS } from "@/lib/constants";
import { getCurrentUserId } from "@/lib/current-user";
import { classifyDifficulty } from "@/lib/oracle";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("quests")
    .select("*")
    .order("created_at", { ascending: false });

  const difficulty = searchParams.get("difficulty");
  if (difficulty) query = query.eq("difficulty", difficulty);

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const category = searchParams.get("category");
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const supabase = await createClient();
  const body = await request.json();

  const goldReward = body.gold_reward ?? 50;

  // Check questgiver has enough gold to escrow
  const { data: profile } = await supabase
    .from("profiles")
    .select("gold")
    .eq("id", userId)
    .single();

  if (!profile || profile.gold < goldReward) {
    return NextResponse.json(
      { error: `Not enough gold. You have ${profile?.gold ?? 0}G but this quest requires ${goldReward}G.` },
      { status: 400 }
    );
  }

  // Oracle auto-classifies difficulty
  const { difficulty, reasoning } = await classifyDifficulty(
    body.title,
    body.description,
    body.acceptance_criteria || null
  );

  const rpReward = (DIFFICULTY_REWARDS[difficulty] ?? DIFFICULTY_REWARDS.C).rp;

  // Escrow gold from questgiver
  await supabase
    .from("profiles")
    .update({ gold: profile.gold - goldReward })
    .eq("id", userId);

  const { data, error } = await supabase
    .from("quests")
    .insert({
      questgiver_id: userId,
      title: body.title,
      description: body.description,
      difficulty,
      category: body.category || "general",
      gold_reward: goldReward,
      rp_reward: rpReward,
      max_attempts: body.max_attempts || 5,
      time_limit_minutes: body.time_limit_minutes || null,
      acceptance_criteria: body.acceptance_criteria || null,
    })
    .select()
    .single();

  if (error) {
    // Refund gold if quest creation fails
    await supabase
      .from("profiles")
      .update({ gold: profile.gold })
      .eq("id", userId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from("activity_log").insert({
    event_type: "quest_posted",
    quest_id: data.id,
    details: {
      title: data.title,
      difficulty: data.difficulty,
      oracle_reasoning: reasoning,
    },
  });

  return NextResponse.json(data, { status: 201 });
}
