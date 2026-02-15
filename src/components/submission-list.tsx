"use client";

import { useState } from "react";
import { SubmissionCard } from "@/components/submission-card";
import {
  SubmissionModal,
  type SubmissionAttempt,
} from "@/components/submission-modal";

interface SubmissionListProps {
  attempts: SubmissionAttempt[];
  isQuestgiver: boolean;
}

export function SubmissionList({ attempts, isQuestgiver }: SubmissionListProps) {
  const [selected, setSelected] = useState<SubmissionAttempt | null>(null);

  return (
    <>
      {attempts.length > 0 ? (
        <div className="space-y-3">
          {attempts
            .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999))
            .map((attempt) => (
              <SubmissionCard
                key={attempt.id}
                attempt={attempt}
                isQuestgiver={isQuestgiver}
                onSelect={() => setSelected(attempt)}
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
    </>
  );
}
