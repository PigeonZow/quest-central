"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RankBadge } from "@/components/rank-badge";
import { SubmissionViewer } from "@/components/submission-viewer";
import { type SubmissionAttempt } from "@/components/submission-modal";
import {
  X,
  Trophy,
  Clock,
  Swords,
} from "lucide-react";

interface CompareModalProps {
  left: SubmissionAttempt | null;
  right: SubmissionAttempt | null;
  onClose: () => void;
}

function ColumnHeader({ attempt }: { attempt: SubmissionAttempt }) {
  const isWinner = attempt.status === "won";

  return (
    <div className="flex items-center gap-2 truncate">
      {isWinner && <Trophy className="h-3.5 w-3.5 shrink-0 text-gold" />}
      {attempt.ranking !== null && (
        <span
          className={`font-heading text-sm font-bold shrink-0 ${
            isWinner ? "text-gold" : "text-muted-foreground"
          }`}
        >
          #{attempt.ranking}
        </span>
      )}
      <span className="font-heading text-sm font-semibold tracking-wide truncate">
        {attempt.party?.name ?? "Unknown Party"}
      </span>
      <RankBadge rank={attempt.party?.rank ?? "Bronze"} />
      <span
        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
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
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          {attempt.time_taken_seconds}s
        </span>
      )}
    </div>
  );
}

export function CompareModal({ left, right, onClose }: CompareModalProps) {
  const isOpen = !!(left && right);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

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
      {isOpen && left && right && (
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
            className="relative flex h-[90vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden rounded-xl border border-gold/15 bg-[#0e0e0c] shadow-2xl shadow-black/60"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Sticky Header ── */}
            <div className="shrink-0 border-b border-gold/15/60 bg-[#111110] px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Swords className="h-4.5 w-4.5 text-gold" />
                  <span className="font-heading text-sm font-semibold tracking-wider uppercase text-gold">
                    Comparing
                  </span>
                  <span className="font-heading text-sm text-foreground/80 truncate max-w-[200px]">
                    {left.party?.name ?? "Unknown"}
                  </span>
                  <span className="text-muted-foreground/50 text-xs">vs</span>
                  <span className="font-heading text-sm text-foreground/80 truncate max-w-[200px]">
                    {right.party?.name ?? "Unknown"}
                  </span>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Split-Screen Body (strict 50/50 grid) ── */}
            <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden">
              {/* Left column */}
              <div className="flex min-w-0 flex-col overflow-hidden border-r border-gold/15/40">
                {/* Column header */}
                <div className="shrink-0 border-b border-gold/15/30 bg-[#0c0c0a] px-4 py-2.5">
                  <ColumnHeader attempt={left} />
                </div>
                {/* Viewer */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
                  {left.result_text ? (
                    <SubmissionViewer content={left.result_text} fillHeight />
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                      No submission content available.
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="flex min-w-0 flex-col overflow-hidden">
                {/* Column header */}
                <div className="shrink-0 border-b border-gold/15/30 bg-[#0c0c0a] px-4 py-2.5">
                  <ColumnHeader attempt={right} />
                </div>
                {/* Viewer */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
                  {right.result_text ? (
                    <SubmissionViewer content={right.result_text} fillHeight />
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                      No submission content available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
