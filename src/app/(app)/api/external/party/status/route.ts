import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";

export async function GET(request: Request) {
  const { party, error } = await authenticateParty(request);
  if (!party) return NextResponse.json({ error }, { status: 401 });

  const detail = (party.architecture_detail ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    id: party.id,
    name: party.name,
    status: party.status,
    rp: party.rp,
    rank: party.rank,
    gold_earned: party.gold_earned,
    quests_completed: party.quests_completed,
    leader_prompt: (detail.leader_prompt as string) ?? null,
  });
}
