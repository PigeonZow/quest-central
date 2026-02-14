"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, DIFFICULTY_REWARDS } from "@/lib/constants";

export default function NewQuestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("C");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const diff = form.get("difficulty") as string;
    const rewards = DIFFICULTY_REWARDS[diff] ?? DIFFICULTY_REWARDS.C;

    const body = {
      title: form.get("title"),
      description: form.get("description"),
      difficulty: diff,
      category: form.get("category"),
      acceptance_criteria: form.get("acceptance_criteria") || null,
      gold_reward: rewards.gold,
      rp_reward: rewards.rp,
      max_attempts: Number(form.get("max_attempts")) || 5,
      time_limit_minutes: form.get("time_limit_minutes")
        ? Number(form.get("time_limit_minutes"))
        : null,
    };

    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const quest = await res.json();
      router.push(`/quests/${quest.id}`);
    } else {
      setLoading(false);
      alert("Failed to create quest");
    }
  }

  const rewards = DIFFICULTY_REWARDS[difficulty] ?? DIFFICULTY_REWARDS.C;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h1 className="font-heading text-sm font-semibold tracking-wider uppercase">
            Post a New Quest
          </h1>
        </div>
        <div className="px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Title
              </label>
              <Input
                name="title"
                placeholder="Fix the authentication bug..."
                required
                className="rounded-sm"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Description
              </label>
              <Textarea
                name="description"
                placeholder="Describe the task in detail..."
                rows={4}
                required
                className="rounded-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Difficulty
                </label>
                <Select
                  name="difficulty"
                  value={difficulty}
                  onValueChange={setDifficulty}
                >
                  <SelectTrigger className="rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">C-Rank (Easy)</SelectItem>
                    <SelectItem value="B">B-Rank (Medium)</SelectItem>
                    <SelectItem value="A">A-Rank (Hard)</SelectItem>
                    <SelectItem value="S">S-Rank (Legendary)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Category
                </label>
                <Select name="category" defaultValue="general">
                  <SelectTrigger className="rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Acceptance Criteria (optional)
              </label>
              <Textarea
                name="acceptance_criteria"
                placeholder="What does a successful completion look like?"
                rows={2}
                className="rounded-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Max Attempts
                </label>
                <Input
                  name="max_attempts"
                  type="number"
                  defaultValue={5}
                  min={1}
                  max={20}
                  className="rounded-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Time Limit (min, optional)
                </label>
                <Input
                  name="time_limit_minutes"
                  type="number"
                  placeholder="No limit"
                  min={1}
                  className="rounded-sm"
                />
              </div>
            </div>

            {/* Reward preview */}
            <div className="rounded-sm bg-secondary/50 border border-border/40 p-3 text-xs">
              <span className="text-gold font-medium">
                {rewards.gold}g
              </span>{" "}
              <span className="text-muted-foreground">
                + {rewards.rp} RP reward
              </span>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-sm text-xs uppercase tracking-wider">
              {loading ? "Posting..." : "Post Quest"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
