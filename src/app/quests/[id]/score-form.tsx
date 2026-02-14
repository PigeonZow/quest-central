"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { QuestAttempt } from "@/lib/types";

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

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(submittedAttempts.map((a) => [a.id, 70]))
  );
  const [feedback, setFeedback] = useState<Record<string, string>>(
    Object.fromEntries(submittedAttempts.map((a) => [a.id, ""]))
  );
  const [winnerId, setWinnerId] = useState<string>(
    submittedAttempts[0]?.id ?? ""
  );

  async function handleScore() {
    setLoading(true);
    const body = {
      scores: submittedAttempts.map((a) => ({
        attempt_id: a.id,
        score: scores[a.id],
        feedback: feedback[a.id] || null,
      })),
      winner_id: winnerId,
    };

    const res = await fetch(`/api/quests/${questId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.refresh();
    } else {
      alert("Failed to score quest");
    }
    setLoading(false);
  }

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="text-sm text-gold">
          Score Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {submittedAttempts.map((attempt) => (
          <div key={attempt.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                {attempt.party?.name}
              </span>
              <span className="font-mono text-sm">
                {scores[attempt.id]}/100
              </span>
            </div>
            <Slider
              value={[scores[attempt.id]]}
              onValueChange={([v]) =>
                setScores((s) => ({ ...s, [attempt.id]: v }))
              }
              min={0}
              max={100}
              step={1}
            />
            <Textarea
              placeholder="Feedback (optional)"
              value={feedback[attempt.id]}
              onChange={(e) =>
                setFeedback((f) => ({ ...f, [attempt.id]: e.target.value }))
              }
              rows={1}
              className="text-xs"
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="radio"
                name="winner"
                checked={winnerId === attempt.id}
                onChange={() => setWinnerId(attempt.id)}
              />
              Pick as winner
            </label>
          </div>
        ))}

        <Button
          onClick={handleScore}
          disabled={loading || !winnerId}
          className="w-full"
        >
          {loading ? "Scoring..." : "Finalize Scores & Pick Winner"}
        </Button>
      </CardContent>
    </Card>
  );
}
