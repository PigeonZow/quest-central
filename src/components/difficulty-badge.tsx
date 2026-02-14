const DIFFICULTY_LABELS: Record<string, string> = {
  C: "Easy",
  B: "Medium",
  A: "Hard",
  S: "Legendary",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-heading text-sm font-bold text-gold leading-none">
        {difficulty}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {DIFFICULTY_LABELS[difficulty] ?? "Rank"}
      </span>
    </div>
  );
}
