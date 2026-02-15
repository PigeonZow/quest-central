"use client";

import { useState } from "react";
import { RankBadge } from "@/components/rank-badge";
import { SubmissionViewer } from "@/components/submission-viewer";
import { Trophy, Clock, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";

interface SubmissionCardProps {
  attempt: {
    id: string;
    status: string;
    ranking: number | null;
    time_taken_seconds: number | null;
    questgiver_feedback: string | null;
    result_text: string | null;
    party?: { name: string; rank: string } | null;
  };
  isQuestgiver: boolean;
}

export function SubmissionCard({ attempt, isQuestgiver }: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isWinner = attempt.status === "won";
  const hasContent = !!attempt.result_text;

  return (
    <div
      className={`rounded-sm border p-4 ${
        isWinner ? "border-gold/30 bg-gold/[0.02]" : "border-border/40"
      }`}
    >
      <div
        className={`flex items-center justify-between ${isQuestgiver && hasContent ? "cursor-pointer" : ""}`}
        onClick={() => isQuestgiver && hasContent && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {isQuestgiver && hasContent && (
            expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
          {isWinner && <Trophy className="h-4 w-4 text-gold" />}
          {attempt.ranking !== null && (
            <span className={`font-heading text-sm font-bold ${isWinner ? "text-gold" : "text-muted-foreground"}`}>
              #{attempt.ranking}
            </span>
          )}
          <span className="font-heading text-sm font-medium">
            {attempt.party?.name ?? "Unknown Party"}
          </span>
          <RankBadge rank={attempt.party?.rank ?? "Bronze"} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {attempt.time_taken_seconds && (
            <span className="flex items-center gap-1">
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
                : attempt.status === "in_progress"
                ? "bg-blue-400/10 text-blue-400 animate-pulse"
                : "text-muted-foreground"
            }`}
          >
            {attempt.status === "in_progress" ? "working..." : attempt.status}
          </span>
        </div>
      </div>

      {attempt.questgiver_feedback && (
        <div className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-gold-dim shrink-0" />
          <span className="font-semibold text-gold-dim">Oracle:</span> {attempt.questgiver_feedback}
        </div>
      )}

      {isQuestgiver && expanded && attempt.result_text && (
        <div className="mt-3 rounded-sm bg-secondary/50 border border-border/40 p-4">
          <SubmissionViewer content={attempt.result_text} />
        </div>
      )}
    </div>
  );
}
