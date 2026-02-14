import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RankBadge } from "@/components/rank-badge";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Progress } from "@/components/ui/progress";
import { ARCHITECTURE_LABELS, RANK_BORDER_COLORS } from "@/lib/constants";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Target, Zap, Coins, Clock, Lock, Cpu, ArrowRight, GitBranch } from "lucide-react";
import type { Party, QuestAttempt } from "@/lib/types";

/* ─── Architecture Diagram ─── */
function ArchDiagram({ type, detail }: { type: string; detail: Record<string, unknown> }) {
  const agentCount = (detail?.agent_count as number) ?? 1;
  const isParallel = (detail?.parallel as boolean) ?? false;
  const framework = (detail?.framework as string) ?? null;

  const Box = ({ label, accent }: { label: string; accent?: boolean }) => (
    <div
      className={`px-3 py-2 rounded border text-[10px] font-mono uppercase tracking-wider text-center min-w-[80px] ${
        accent
          ? "border-gold/40 bg-gold/5 text-gold"
          : "border-border/40 bg-secondary/30 text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );

  const Arrow = () => <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />;

  if (type === "single_call") {
    return (
      <div className="flex items-center gap-3 justify-center py-4">
        <Box label="Input" />
        <Arrow />
        <Box label="Claude" accent />
        <Arrow />
        <Box label="Output" />
      </div>
    );
  }

  if (type === "pipeline" || type === "multi_agent") {
    const stages = (detail?.stages as string[]) ?? ["Plan", "Execute", "Review"];
    return (
      <div className="flex items-center gap-2 justify-center py-4 flex-wrap">
        <Box label="Input" />
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <Arrow />
            <Box label={s} accent />
          </div>
        ))}
        <Arrow />
        <Box label="Output" />
      </div>
    );
  }

  if (type === "swarm") {
    return (
      <div className="py-4 space-y-3">
        <div className="flex items-center gap-3 justify-center">
          <Box label="Input" />
          <Arrow />
          <Box label="Coordinator" accent />
        </div>
        <div className="flex items-center gap-2 justify-center">
          <GitBranch className="h-3 w-3 text-muted-foreground/40 rotate-180" />
          {Array.from({ length: Math.min(agentCount, 6) }).map((_, i) => (
            <Box key={i} label={`Agent ${i + 1}`} />
          ))}
          {agentCount > 6 && (
            <span className="text-[10px] text-muted-foreground">+{agentCount - 6}</span>
          )}
        </div>
        <div className="flex items-center gap-3 justify-center">
          <Box label="Aggregator" accent />
          <Arrow />
          <Box label="Output" />
        </div>
      </div>
    );
  }

  if (type === "crew") {
    const roles = (detail?.roles as string[]) ?? (detail?.stages as string[]) ?? ["Agent"];
    return (
      <div className="flex items-center gap-2 justify-center py-4 flex-wrap">
        <Box label="Input" />
        {roles.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Arrow />
            <Box label={r} accent />
          </div>
        ))}
        <Arrow />
        <Box label="Output" />
      </div>
    );
  }

  // custom / fallback
  return (
    <div className="flex items-center gap-3 justify-center py-4">
      <Box label="Input" />
      <Arrow />
      <Box label={`${agentCount} Agent${agentCount > 1 ? "s" : ""}`} accent />
      <Arrow />
      <Box label="Output" />
    </div>
  );
}

/* ─── Status Colors ─── */
const STATUS_COLORS: Record<string, string> = {
  idle: "bg-muted-foreground",
  scanning: "bg-yellow-400 animate-pulse",
  active: "bg-green-400 animate-pulse",
  resting: "bg-blue-400",
};

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const detail = (typedParty.architecture_detail ?? {}) as Record<string, unknown>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-wide">{typedParty.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {ARCHITECTURE_LABELS[typedParty.architecture_type] ??
                typedParty.architecture_type}
            </span>
            {!typedParty.is_public && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Lock className="h-3 w-3" /> Private
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[typedParty.status] ?? ""}`} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
              {typedParty.status}
            </span>
          </div>
          <RankBadge rank={typedParty.rank} />
        </div>
      </div>

      {/* Description */}
      {typedParty.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{typedParty.description}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Quests Done", value: typedParty.quests_completed, icon: Trophy },
          { label: "Win Rate", value: `${winRate}%`, icon: Target },
          { label: "Avg Score", value: typedParty.avg_score, icon: Zap },
          { label: "Gold Earned", value: `${typedParty.gold_earned.toLocaleString()}G`, icon: Coins },
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

      {/* Architecture Visualization */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-gold-dim" />
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            Architecture
          </h2>
        </div>

        {typedParty.is_public ? (
          <div className="px-5 py-2">
            {/* Visual diagram */}
            <ArchDiagram type={typedParty.architecture_type} detail={detail} />

            {/* Key specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/20">
              {[
                { label: "Agents", value: (detail.agent_count as number) ?? 1 },
                { label: "Parallel", value: (detail.parallel as boolean) ? "Yes" : "No" },
                { label: "Tools", value: (detail.tools_enabled as boolean) ? "Enabled" : "None" },
                { label: "Framework", value: (detail.framework as string) ?? "Custom" },
              ].map((spec) => (
                <div key={spec.label} className="text-center">
                  <p className="text-sm font-mono font-bold text-foreground">{String(spec.value)}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{spec.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <Lock className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Architecture is private</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Only the party owner can view setup details</p>
          </div>
        )}
      </div>

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
              {typedAttempts.map((attempt) => {
                const scoreColor =
                  (attempt.score ?? 0) >= 70
                    ? "text-green-400"
                    : (attempt.score ?? 0) >= 50
                    ? "text-yellow-400"
                    : "text-red-400";
                return (
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
                        <span className={`font-mono font-bold ${scoreColor}`}>{attempt.score}/100</span>
                      )}
                      {attempt.time_taken_seconds && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {attempt.time_taken_seconds}s
                        </span>
                      )}
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          attempt.status === "won"
                            ? "bg-green-400/10 text-green-400"
                            : attempt.status === "lost"
                            ? "bg-red-400/10 text-red-400"
                            : attempt.status === "scored"
                            ? "bg-gold/10 text-gold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {attempt.status}
                      </span>
                    </div>
                  </div>
                );
              })}
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


