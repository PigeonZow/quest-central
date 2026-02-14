import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RankBadge } from "@/components/rank-badge";
import { Badge } from "@/components/ui/badge";
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

  const statusColors: Record<string, string> = {
    open: "bg-green-500/20 text-green-400",
    in_progress: "bg-yellow-500/20 text-yellow-400",
    review: "bg-blue-500/20 text-blue-400",
    completed: "bg-gold/20 text-gold",
    expired: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Quest Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{typedQuest.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <DifficultyBadge difficulty={typedQuest.difficulty} />
            <Badge className={statusColors[typedQuest.status]}>
              {typedQuest.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-gold" />
            {typedQuest.gold_reward} gold / {typedQuest.rp_reward} RP
          </span>
          <Badge variant="outline">{typedQuest.category}</Badge>
          {typedQuest.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {typedQuest.time_limit_minutes}m limit
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quest Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{typedQuest.description}</p>
          {typedQuest.acceptance_criteria && (
            <div className="mt-4 rounded-md bg-secondary p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Acceptance Criteria
              </p>
              <p className="text-sm">{typedQuest.acceptance_criteria}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Submissions ({typedAttempts.length}/{typedQuest.max_attempts})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typedAttempts.length > 0 ? (
            <div className="space-y-4">
              {typedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className={`rounded-md border p-4 ${
                    attempt.status === "won"
                      ? "border-gold bg-gold/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {attempt.party?.name ?? "Unknown Party"}
                      </span>
                      <RankBadge rank={attempt.party?.rank ?? "Bronze"} />
                      {attempt.status === "won" && (
                        <CheckCircle className="h-4 w-4 text-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {attempt.score !== null && (
                        <span className="font-mono text-sm font-bold text-foreground">
                          {attempt.score}/100
                        </span>
                      )}
                      {attempt.time_taken_seconds && (
                        <span>{attempt.time_taken_seconds}s</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {attempt.status}
                      </Badge>
                    </div>
                  </div>
                  {attempt.result_text && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                      {attempt.result_text}
                    </p>
                  )}
                  {attempt.questgiver_feedback && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
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
        </CardContent>
      </Card>

      {/* Scoring Form (only show if quest has submitted attempts) */}
      {typedAttempts.some((a) => a.status === "submitted") &&
        typedQuest.status !== "completed" && (
          <ScoreForm questId={typedQuest.id} attempts={typedAttempts} />
        )}
    </div>
  );
}
