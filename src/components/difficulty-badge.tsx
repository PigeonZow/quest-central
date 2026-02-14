import { Badge } from "@/components/ui/badge";

const COLORS: Record<string, string> = {
  C: "bg-difficulty-c hover:bg-difficulty-c/80 text-white border-difficulty-c",
  B: "bg-difficulty-b hover:bg-difficulty-b/80 text-white border-difficulty-b",
  A: "bg-difficulty-a hover:bg-difficulty-a/80 text-white border-difficulty-a",
  S: "bg-difficulty-s hover:bg-difficulty-s/80 text-white border-difficulty-s",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <Badge className={`${COLORS[difficulty] ?? COLORS.C} font-bold text-xs px-2`}>
      {difficulty}-Rank
    </Badge>
  );
}
