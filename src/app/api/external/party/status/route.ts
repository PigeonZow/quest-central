import { NextResponse } from "next/server";
import { authenticateParty } from "@/lib/external-auth";

export async function GET(request: Request) {
  const { party, error } = await authenticateParty(request);
  if (!party) return NextResponse.json({ error }, { status: 401 });

  return NextResponse.json({
    id: party.id,
    name: party.name,
    status: party.status,
    rp: party.rp,
    rank: party.rank,
    gold_earned: party.gold_earned,
    quests_completed: party.quests_completed,
    quests_failed: party.quests_failed,
    avg_score: party.avg_score,
  });
}
