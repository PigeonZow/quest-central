import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RankBadge } from "@/components/rank-badge";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Progress } from "@/components/ui/progress";
import { RANK_BORDER_COLORS } from "@/lib/constants";
import { getCurrentUserId } from "@/lib/current-user";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Target, Zap, Coins, Clock, Lock } from "lucide-react";
import type { Party, QuestAttempt } from "@/lib/types";

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUserId = await getCurrentUserId();
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("*")
    .eq("id", id)
    .single();

  if (!party) notFound();

  const { data: attempts } = await supabase
    .from("quest_attempts")
    .select("*, quest:quests(title, difficulty)")
    .eq("party_id", id)
    .order("started_at", { ascending: false })
    .limit(20);

  const typedParty = party as Party;
  const typedAttempts = (attempts ?? []) as (QuestAttempt & {
    quest: { title: string; difficulty: string };
  })[];

  const { progress, nextRank, rpNeeded } = rpToNextRank(
    typedParty.rank,
    typedParty.rp
  );
  const total = typedParty.quests_completed + typedParty.quests_failed;
  const winRate = total > 0 ? Math.round((typedParty.quests_completed / total) * 100) : 0;

  const statusLabels: Record<string, string> = {
    idle: "Idle",
    scanning: "Scanning",
    active: "Active",
    resting: "Resting",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-wide">{typedParty.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
            {statusLabels[typedParty.status] ?? typedParty.status}
          </span>
          <RankBadge rank={typedParty.rank} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Quests Done", value: typedParty.quests_completed, icon: Trophy },
          { label: "Win Rate", value: `${winRate}%`, icon: Target },
          { label: "Avg Score", value: typedParty.avg_score, icon: Zap },
          { label: "Gold Earned", value: typedParty.gold_earned, icon: Coins },
        ].map((stat) => (
          <div key={stat.label} className="card-rpg rounded-sm p-4 flex items-center gap-3">
            <stat.icon className="h-5 w-5 text-gold-dim" />
            <div>
              <p className="font-heading text-base font-bold">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* RP Progress */}
      <div className={`card-rpg rounded-sm border ${RANK_BORDER_COLORS[typedParty.rank]} p-4`}>
        <div className="flex justify-between text-xs mb-2">
          <span>
            {typedParty.rp} RP ({typedParty.rank})
          </span>
          {nextRank ? (
            <span className="text-muted-foreground">
              {rpNeeded} RP to {nextRank}
            </span>
          ) : (
            <span className="text-gold">Max Rank</span>
          )}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Architecture Details — owner only */}
      {typedParty.owner_id === currentUserId ? (
        typedParty.architecture_detail && Object.keys(typedParty.architecture_detail).length > 0 && (
          <div className="card-rpg rounded-sm">
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
              <Lock className="h-3 w-3 text-muted-foreground/60" />
              <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                Setup Notes (Private)
              </h2>
            </div>
            <div className="px-5 py-4">
              <pre className="bg-secondary/50 rounded-sm p-4 text-xs font-mono overflow-x-auto">
                {JSON.stringify(typedParty.architecture_detail, null, 2)}
              </pre>
            </div>
          </div>
        )
      ) : (
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              Architecture Hidden
            </h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-muted-foreground">
              This party&apos;s setup is hidden. In the future, pay gold to reveal top-performing architectures.
            </p>
          </div>
        </div>
      )}

      {typedParty.description && (
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40">
            <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              Description
            </h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed">{typedParty.description}</p>
          </div>
        </div>
      )}

      {/* Quest History */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            Recent Quest History
          </h2>
        </div>
        <div className="px-5 py-4">
          {typedAttempts.length > 0 ? (
            <div className="space-y-2">
              {typedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="glow-row flex items-center justify-between text-xs py-2 border-b border-border/20 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <DifficultyBadge difficulty={attempt.quest?.difficulty ?? "C"} />
                    <span className="glow-text text-foreground">{attempt.quest?.title ?? "Unknown Quest"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.score !== null && (
                      <span className="font-mono">{attempt.score}/100</span>
                    )}
                    {attempt.time_taken_seconds && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {attempt.time_taken_seconds}s
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {attempt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No quests attempted yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
