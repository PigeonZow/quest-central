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

  const { data, error: dbError } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .single();

  if (dbError) return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  return NextResponse.json(data);
}
