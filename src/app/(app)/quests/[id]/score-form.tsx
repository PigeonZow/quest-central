"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { QuestAttempt } from "@/lib/types";
import { ChevronUp, ChevronDown } from "lucide-react";

interface ScoreFormProps {
  questId: string;
  attempts: (QuestAttempt & {
    party: { name: string; rank: string; architecture_type: string };
  })[];
}

export function ScoreForm({ questId, attempts }: ScoreFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const submittedAttempts = attempts.filter((a) => a.status === "submitted");

  // Ordered list of attempt IDs (index 0 = 1st place)
  const [rankedIds, setRankedIds] = useState<string[]>(
    submittedAttempts.map((a) => a.id)
  );
  const [feedback, setFeedback] = useState<Record<string, string>>(
    Object.fromEntries(submittedAttempts.map((a) => [a.id, ""]))
  );

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...rankedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setRankedIds(next);
  }

  function moveDown(index: number) {
    if (index === rankedIds.length - 1) return;
    const next = [...rankedIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setRankedIds(next);
  }

  async function handleScore() {
    setLoading(true);
    const body = {
      rankings: rankedIds.map((id, index) => ({
        attempt_id: id,
        ranking: index + 1,
        feedback: feedback[id] || null,
      })),
    };

    const res = await fetch(`/api/quests/${questId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.refresh();
    } else {
      alert("Failed to rank submissions");
    }
    setLoading(false);
  }

  return (
    <div className="card-rpg rounded-sm border-gold/20">
      <div className="px-5 py-3 border-b border-border/40">
        <h2 className="font-heading text-[10px] font-semibold tracking-wider uppercase text-gold">
          Rank Submissions
        </h2>
        <p className="text-[10px] text-muted-foreground mt-1">
          Drag to reorder. #1 is the winner.
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {rankedIds.map((id, index) => {
          const attempt = submittedAttempts.find((a) => a.id === id);
          if (!attempt) return null;
          return (
            <div
              key={id}
              className={`rounded-sm border p-3 ${
                index === 0
                  ? "border-gold/30 bg-gold/[0.02]"
                  : "border-border/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-heading text-sm font-bold ${index === 0 ? "text-gold" : "text-muted-foreground"}`}>
                    #{index + 1}
                  </span>
                  <span className="font-heading text-sm font-medium">
                    {attempt.party?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-secondary/50 disabled:opacity-20"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === rankedIds.length - 1}
                    className="p-1 rounded hover:bg-secondary/50 disabled:opacity-20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {attempt.result_text && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {attempt.result_text}
                </p>
              )}
              <Textarea
                placeholder="Feedback (optional)"
                value={feedback[id]}
                onChange={(e) =>
                  setFeedback((f) => ({ ...f, [id]: e.target.value }))
                }
                rows={1}
                className="text-xs"
              />
            </div>
          );
        })}

        <Button
          onClick={handleScore}
          disabled={loading || rankedIds.length === 0}
          className="w-full rounded-sm text-xs uppercase tracking-wider"
        >
          {loading ? "Finalizing..." : "Finalize Rankings"}
        </Button>
      </div>
    </div>
  );
}
