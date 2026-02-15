"use client";

import { useState, useMemo } from "react";
import { SubmissionCard } from "@/components/submission-card";
import {
  SubmissionModal,
  type SubmissionAttempt,
} from "@/components/submission-modal";
import { CompareModal } from "@/components/compare-modal";
import { Swords } from "lucide-react";

interface SubmissionListProps {
  attempts: SubmissionAttempt[];
  isQuestgiver: boolean;
}

export function SubmissionList({ attempts, isQuestgiver }: SubmissionListProps) {
  const [selected, setSelected] = useState<SubmissionAttempt | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const sorted = useMemo(
    () => [...attempts].sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999)),
    [attempts],
  );

  // Number of submissions that are comparable (questgiver + has content)
  const comparableCount = useMemo(
    () => (isQuestgiver ? sorted.filter((a) => !!a.result_text).length : 0),
    [sorted, isQuestgiver],
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const compareLeft = compareIds[0]
    ? sorted.find((a) => a.id === compareIds[0]) ?? null
    : null;
  const compareRight = compareIds[1]
    ? sorted.find((a) => a.id === compareIds[1]) ?? null
    : null;

  return (
    <>
      {/* Compare button — visible when exactly 2 selected */}
      {compareIds.length === 2 && (
        <button
          onClick={() => setShowCompare(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-sm border border-gold/30 bg-gold/[0.06] px-4 py-2.5 font-heading text-sm font-semibold uppercase tracking-wider text-gold transition-all hover:bg-gold/[0.12] hover:shadow-[0_0_16px_rgba(200,168,78,0.2)] shadow-[0_0_10px_rgba(200,168,78,0.12)] animate-pulse"
        >
          <Swords className="h-4 w-4" />
          Compare Selected (2)
        </button>
      )}

      {attempts.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((attempt) => (
            <SubmissionCard
              key={attempt.id}
              attempt={attempt}
              isQuestgiver={isQuestgiver}
              onSelect={() => setSelected(attempt)}
              isCompareChecked={compareIds.includes(attempt.id)}
              compareDisabled={
                compareIds.length >= 2 && !compareIds.includes(attempt.id)
              }
              onCompareToggle={
                comparableCount >= 2 ? () => toggleCompare(attempt.id) : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No attempts yet. Waiting for adventuring parties...
        </p>
      )}

      <SubmissionModal
        attempt={selected}
        onClose={() => setSelected(null)}
      />

      <CompareModal
        left={showCompare ? compareLeft : null}
        right={showCompare ? compareRight : null}
        onClose={() => setShowCompare(false)}
      />
    </>
  );
}
