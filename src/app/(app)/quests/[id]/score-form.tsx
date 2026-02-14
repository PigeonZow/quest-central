"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { QuestAttempt } from "@/lib/types";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";

interface ScoreFormProps {
  questId: string;
  attempts: (QuestAttempt & {
    party: { name: string; rank: string; architecture_type: string };
  })[];
}

export function ScoreForm({ questId, attempts }: ScoreFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const submittedAttempts = attempts.filter((a) => ["submitted", "scored"].includes(a.status));

  const [rankedIds, setRankedIds] = useState<string[]>(
    submittedAttempts.map((a) => a.id)
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
        feedback: null,
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
          Close Quest &amp; Rank Submissions
        </h2>
        <p className="text-[10px] text-muted-foreground mt-1">
          Drag to reorder or use arrows. #1 is the winner. This closes the quest and distributes rewards.
        </p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <Reorder.Group
          axis="y"
          values={rankedIds}
          onReorder={setRankedIds}
          className="space-y-3"
        >
          <AnimatePresence>
            {rankedIds.map((id, index) => {
              const attempt = submittedAttempts.find((a) => a.id === id);
              if (!attempt) return null;
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  className={`rounded-sm border p-3 cursor-grab active:cursor-grabbing ${
                    index === 0
                      ? "border-gold/30 bg-gold/[0.02]"
                      : "border-border/40"
                  }`}
                  style={{ position: "relative" }}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    zIndex: 50,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <motion.span
                        key={index}
                        initial={{ scale: 1.3, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`font-heading text-sm font-bold ${index === 0 ? "text-gold" : "text-muted-foreground"}`}
                      >
                        #{index + 1}
                      </motion.span>
                      <span className="font-heading text-sm font-medium">
                        {attempt.party?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-secondary/50 disabled:opacity-20 transition-opacity"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                        disabled={index === rankedIds.length - 1}
                        className="p-1 rounded hover:bg-secondary/50 disabled:opacity-20 transition-opacity"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>

        <Button
          onClick={handleScore}
          disabled={loading || rankedIds.length === 0}
          className="w-full rounded-sm text-xs uppercase tracking-wider"
        >
          {loading ? "Finalizing..." : "Close Quest & Finalize Rankings"}
        </Button>
      </div>
    </div>
  );
}
