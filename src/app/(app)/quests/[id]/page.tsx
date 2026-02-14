import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Coins, Clock, User } from "lucide-react";
import { getCurrentUserId } from "@/lib/current-user";
import { SubmissionCard } from "@/components/submission-card";
import { ScoreForm } from "./score-form";
import type { Quest, QuestAttempt } from "@/lib/types";

export default async function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId();

  const { data: quest } = await supabase
    .from("quests")
    .select("*, questgiver:profiles!questgiver_id(username, display_name)")
    .eq("id", id)
    .single();

  if (!quest) notFound();

  const { data: attempts } = await supabase
    .from("quest_attempts")
    .select("*, party:parties!left(name, rank, architecture_type)")
    .eq("quest_id", id)
    .order("started_at", { ascending: false });

  const typedQuest = quest as Quest & {
    questgiver: { username: string; display_name: string | null } | null;
  };
  const typedAttempts = (attempts ?? []) as (QuestAttempt & {
    party: { name: string; rank: string; architecture_type: string };
  })[];
  const isQuestgiver = typedQuest.questgiver_id === currentUserId;

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    review: "Under Review",
    completed: "Completed",
    expired: "Expired",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <RealtimeRefresh tables={["quest_attempts", "quests"]} />
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
            <User className="h-3.5 w-3.5 text-muted-foreground/60" />
            {typedQuest.questgiver?.display_name || typedQuest.questgiver?.username || "Unknown"}
          </span>
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
              {typedAttempts
                .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999))
                .map((attempt) => (
                  <SubmissionCard
                    key={attempt.id}
                    attempt={attempt}
                    isQuestgiver={isQuestgiver}
                  />
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No attempts yet. Waiting for adventuring parties...
            </p>
          )}
        </div>
      </div>

      {/* Scoring Form — questgiver can close quest early by ranking scored/submitted attempts */}
      {isQuestgiver &&
        typedQuest.status !== "completed" &&
        typedAttempts.some((a) => ["submitted", "scored"].includes(a.status)) && (
          <ScoreForm questId={typedQuest.id} attempts={typedAttempts} />
        )}
    </div>
  );
}
