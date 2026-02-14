import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RankBadge } from "@/components/rank-badge";
import { Coins, Clock, CheckCircle } from "lucide-react";
import { ScoreForm } from "./score-form";
import type { Quest, QuestAttempt } from "@/lib/types";

export default async function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quest } = await supabase
    .from("quests")
    .select("*")
    .eq("id", id)
    .single();

  if (!quest) notFound();

  const { data: attempts } = await supabase
    .from("quest_attempts")
    .select("*, party:parties(name, rank, architecture_type)")
    .eq("quest_id", id)
    .order("started_at", { ascending: false });

  const typedQuest = quest as Quest;
  const typedAttempts = (attempts ?? []) as (QuestAttempt & {
    party: { name: string; rank: string; architecture_type: string };
  })[];

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    review: "Under Review",
    completed: "Completed",
    expired: "Expired",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Quest Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-heading text-xl font-semibold tracking-wide">{typedQuest.title}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <DifficultyBadge difficulty={typedQuest.difficulty} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
              {statusLabels[typedQuest.status] ?? typedQuest.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-gold-dim" />
            {typedQuest.gold_reward}g / {typedQuest.rp_reward} RP
          </span>
          <span className="text-[10px] uppercase tracking-wider">{typedQuest.category}</span>
          {typedQuest.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {typedQuest.time_limit_minutes}m limit
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            Quest Description
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{typedQuest.description}</p>
          {typedQuest.acceptance_criteria && (
            <div className="mt-4 rounded-sm bg-secondary/50 border border-border/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Acceptance Criteria
              </p>
              <p className="text-sm leading-relaxed">{typedQuest.acceptance_criteria}</p>
            </div>
          )}
        </div>
      </div>

      {/* Attempts */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
            Submissions ({typedAttempts.length}/{typedQuest.max_attempts})
          </h2>
        </div>
        <div className="px-5 py-4">
          {typedAttempts.length > 0 ? (
            <div className="space-y-3">
              {typedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className={`rounded-sm border p-4 ${
                    attempt.status === "won"
                      ? "border-gold/30 bg-gold/[0.02]"
                      : "border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-medium">
                        {attempt.party?.name ?? "Unknown Party"}
                      </span>
                      <RankBadge rank={attempt.party?.rank ?? "Bronze"} />
                      {attempt.status === "won" && (
                        <CheckCircle className="h-3.5 w-3.5 text-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {attempt.score !== null && (
                        <span className="font-mono text-sm font-bold text-foreground">
                          {attempt.score}/100
                        </span>
                      )}
                      {attempt.time_taken_seconds && (
                        <span>{attempt.time_taken_seconds}s</span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider">
                        {attempt.status}
                      </span>
                    </div>
                  </div>
                  {attempt.result_text && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed">
                      {attempt.result_text}
                    </p>
                  )}
                  {attempt.questgiver_feedback && (
                    <p className="text-xs text-muted-foreground/60 mt-2 italic">
                      Feedback: {attempt.questgiver_feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No attempts yet. Waiting for adventuring parties...
            </p>
          )}
        </div>
      </div>

      {/* Scoring Form */}
      {typedAttempts.some((a) => a.status === "submitted") &&
        typedQuest.status !== "completed" && (
          <ScoreForm questId={typedQuest.id} attempts={typedAttempts} />
        )}
    </div>
  );
}
