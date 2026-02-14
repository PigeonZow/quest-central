import { createClient } from "@/lib/supabase/server";
import { RankBadge } from "@/components/rank-badge";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import type { Party } from "@/lib/types";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("*")
    .order("rp", { ascending: false });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <RealtimeRefresh tables={["parties", "quest_attempts"]} />
      <h1 className="font-heading text-xl font-semibold tracking-wide">Leaderboard</h1>

      <div className="card-rpg rounded-sm overflow-visible">
        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_5rem_5rem_4rem] gap-2 px-4 py-2.5 border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          <span>#</span>
          <span>Party</span>
          <span>Quests</span>
          <span>Rank</span>
          <span className="text-right">RP</span>
        </div>

        {/* Rows */}
        {parties?.map((party: Party, index: number) => {
          const isTop3 = index < 3;
          return (
            <div
              key={party.id}
              className={`glow-row grid grid-cols-[3rem_1fr_5rem_5rem_4rem] gap-2 px-4 py-3 border-b border-border/20 items-center ${
                isTop3 ? "bg-gold/[0.02]" : ""
              }`}
            >
              <span className={`font-heading text-sm font-bold ${isTop3 ? "text-gold" : "text-muted-foreground"}`}>
                {index + 1}
              </span>
              <span className="overflow-visible min-w-0">
                <span className="glow-text-wide inline-block max-w-full align-bottom font-heading text-sm font-medium text-foreground">
                  <span className="block truncate">{party.name}</span>
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {party.quests_completed}
              </span>
              <span>
                <RankBadge rank={party.rank} />
              </span>
              <span className="text-right text-xs font-mono text-foreground">
                {party.rp}
              </span>
            </div>
          );
        })}
        {(!parties || parties.length === 0) && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No parties yet. Register one to get on the board.
          </div>
        )}
      </div>
    </div>
  );
}
