"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RankBadge } from "@/components/rank-badge";
import { SubmissionViewer } from "@/components/submission-viewer";
import {
  X,
  Trophy,
  Clock,
  CheckCircle,
  Code2,
} from "lucide-react";

export interface SubmissionAttempt {
  id: string;
  status: string;
  ranking: number | null;
  time_taken_seconds: number | null;
  questgiver_feedback: string | null;
  result_text: string | null;
  party?: { name: string; rank: string } | null;
}

interface SubmissionModalProps {
  attempt: SubmissionAttempt | null;
  onClose: () => void;
}

/** Detect if text contains code blocks or raw HTML */
function textHasCode(text: string | null): boolean {
  if (!text) return false;
  return /```[\s\S]*?```/.test(text) || /<!DOCTYPE\s+html>/i.test(text);
}

export function SubmissionModal({ attempt, onClose }: SubmissionModalProps) {
  // Body scroll lock
  useEffect(() => {
    if (attempt) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [attempt]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {attempt && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal container */}
          <motion.div
            className="relative flex h-[90vh] w-11/12 max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0e0e0c] shadow-2xl shadow-black/60"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Sticky Header ── */}
            <div className="shrink-0 border-b border-slate-700/60 bg-[#111110] px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: agent info */}
                <div className="flex items-center gap-3">
                  {attempt.status === "won" && (
                    <Trophy className="h-4.5 w-4.5 text-gold" />
                  )}
                  {attempt.ranking !== null && (
                    <span
                      className={`font-heading text-base font-bold ${
                        attempt.status === "won"
                          ? "text-gold"
                          : "text-muted-foreground"
                      }`}
                    >
                      #{attempt.ranking}
                    </span>
                  )}
                  <span className="font-heading text-base font-semibold tracking-wide">
                    {attempt.party?.name ?? "Unknown Party"}
                  </span>
                  <RankBadge rank={attempt.party?.rank ?? "Bronze"} />

                  {/* Status badge */}
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
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

                  {attempt.time_taken_seconds && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {attempt.time_taken_seconds}s
                    </span>
                  )}

                  {textHasCode(attempt.result_text) && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-gold/20 bg-gold/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold shadow-[0_0_8px_rgba(200,168,78,0.15)]">
                      <Code2 className="h-3 w-3" />
                      Code Included
                    </span>
                  )}
                </div>

                {/* Right: close button */}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Oracle feedback */}
              {attempt.questgiver_feedback && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <CheckCircle className="h-3 w-3 text-gold-dim shrink-0" />
                  <span className="font-semibold text-gold-dim">Oracle:</span>{" "}
                  {attempt.questgiver_feedback}
                </div>
              )}
            </div>

            {/* ── Modal Body — SubmissionViewer fills remaining space ── */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
              {attempt.result_text ? (
                <SubmissionViewer
                  content={attempt.result_text}
                  fillHeight
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  No submission content available.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
