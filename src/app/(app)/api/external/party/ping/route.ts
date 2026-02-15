import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { party, error } = await authenticateParty(request);
  if (!party) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createServiceClient();
  await supabase
    .from("parties")
    .update({ last_ping_at: new Date().toISOString() })
    .eq("id", party.id);

  return NextResponse.json({
    ok: true,
    party: {
      id: party.id,
      name: party.name,
      status: party.status,
      rank: party.rank,
    },
  });
}
