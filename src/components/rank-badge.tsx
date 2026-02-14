import { Badge } from "@/components/ui/badge";

const RANK_STYLES: Record<string, string> = {
  Bronze: "bg-rank-bronze/20 text-rank-bronze border-rank-bronze/50",
  Silver: "bg-rank-silver/20 text-rank-silver border-rank-silver/50",
  Gold: "bg-rank-gold/20 text-rank-gold border-rank-gold/50",
  Platinum: "bg-rank-platinum/20 text-rank-platinum border-rank-platinum/50",
  Adamantite: "bg-rank-adamantite/20 text-rank-adamantite border-rank-adamantite/50",
};

export function RankBadge({ rank }: { rank: string }) {
  return (
    <Badge
      variant="outline"
      className={`${RANK_STYLES[rank] ?? RANK_STYLES.Bronze} font-bold text-xs`}
    >
      {rank}
    </Badge>
  );
}
