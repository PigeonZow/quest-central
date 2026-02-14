import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .order("rp", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("parties")
    .insert({
      owner_id: DEMO_USER_ID,
      name: body.name,
      description: body.description || null,
      architecture_type: body.architecture_type,
      architecture_detail: body.architecture_detail || {},
      is_public: body.is_public ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
