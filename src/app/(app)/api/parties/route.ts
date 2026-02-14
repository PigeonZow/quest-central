import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getCurrentUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .eq("owner_id", userId)
    .order("rp", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("parties")
    .insert({
      owner_id: userId,
      name: body.name,
      description: body.description || null,
      architecture_type: body.architecture_type || "custom",
      architecture_detail: body.architecture_detail || {},
      is_public: body.is_public ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
