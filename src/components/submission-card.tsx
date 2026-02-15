"use client";

import { RankBadge } from "@/components/rank-badge";
import { Trophy, Clock, Eye } from "lucide-react";

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
  onSelect?: () => void;
  /** Compare mode */
  isCompareChecked?: boolean;
  compareDisabled?: boolean;
  onCompareToggle?: () => void;
}

export function SubmissionCard({
  attempt,
  isQuestgiver,
  onSelect,
  isCompareChecked,
  compareDisabled,
  onCompareToggle,
}: SubmissionCardProps) {
  const isWinner = attempt.status === "won";
  const hasContent = !!attempt.result_text;
  const canOpen = isQuestgiver && hasContent;
  const showCompare = isQuestgiver && hasContent && onCompareToggle;

  return (
    <div
      className={`rounded-sm border p-4 transition-colors ${
        isWinner ? "border-gold/30 bg-gold/[0.02]" : "border-border/40"
      } ${canOpen ? "cursor-pointer hover:border-gold/20 hover:bg-white/[0.01]" : ""}`}
      onClick={() => canOpen && onSelect?.()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Compare checkbox */}
          {showCompare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!compareDisabled || isCompareChecked) {
                  onCompareToggle();
                }
              }}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-all ${
                isCompareChecked
                  ? "border-gold bg-gold/20 text-gold shadow-[0_0_6px_rgba(200,168,78,0.25)]"
                  : compareDisabled
                    ? "border-gold/15 bg-transparent cursor-not-allowed opacity-30"
                    : "border-gold/30 bg-transparent hover:border-gold/50"
              }`}
              aria-label={`Select ${attempt.party?.name ?? "party"} for comparison`}
            >
              {isCompareChecked && (
                <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
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
          {canOpen && (
            <Eye className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </div>
      </div>

      {attempt.questgiver_feedback && (
        <div className="mt-3 rounded-sm border border-border/30 bg-secondary/30 px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-wider text-gold-dim/70 mb-1">Oracle Feedback</p>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{attempt.questgiver_feedback}</p>
        </div>
      )}
    </div>
  );
}
