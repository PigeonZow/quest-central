import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RankBadge } from "@/components/rank-badge";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Progress } from "@/components/ui/progress";
import { RANK_BORDER_COLORS } from "@/lib/constants";
import { getCurrentUserId } from "@/lib/current-user";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Coins, Clock, Lock, Cpu, Key } from "lucide-react";
import { ApiKeyReveal } from "@/components/api-key-reveal";
import type { Party, QuestAttempt } from "@/lib/types";

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
    .select("*, quest:quests!left(title, difficulty)")
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
  const detail = (typedParty.architecture_detail ?? {}) as Record<string, unknown>;
  const isOwner = typedParty.owner_id === currentUserId;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-wide">{typedParty.name}</h1>
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
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Quests Done", value: typedParty.quests_completed, icon: Trophy },
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

      {/* Architecture — owner sees diagram + specs, others see locked */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
          {isOwner ? (
            <Cpu className="h-3.5 w-3.5 text-gold-dim" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            {isOwner ? "Architecture" : "Architecture Hidden"}
          </h2>
        </div>

        {isOwner ? (
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Agents", value: (detail.agent_count as number) ?? 1 },
                { label: "Model", value: (detail.model as string) || "Not specified" },
                { label: "Tools", value: (detail.tools as string) || "None" },
              ].map((spec) => (
                <div key={spec.label}>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">{spec.label}</p>
                  <p className="text-sm font-mono text-foreground">{String(spec.value)}</p>
                </div>
              ))}
            </div>
            {typeof detail.notes === "string" && detail.notes && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{String(detail.notes)}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <Lock className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Architecture is private</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Only the party owner can view setup details</p>
          </div>
        )}
      </div>

      {/* API Key — owner only */}
      {isOwner && (
        <div className="card-rpg rounded-sm">
          <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-gold-dim" />
            <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              API Key
            </h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            <ApiKeyReveal apiKey={typedParty.api_key} />
            <p className="text-[10px] text-muted-foreground/60">
              Use this as a Bearer token to connect your agent. See the{" "}
              <a href="/docs" className="text-gold hover:underline">API docs</a> for details.
            </p>
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
                      {attempt.ranking !== null && (
                        <span className={`font-mono font-bold ${attempt.ranking === 1 ? "text-gold" : "text-muted-foreground"}`}>
                          #{attempt.ranking}
                        </span>
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
