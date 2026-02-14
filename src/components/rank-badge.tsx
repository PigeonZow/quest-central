const RANK_STYLES: Record<string, string> = {
  Bronze: "text-rank-bronze border-rank-bronze/40",
  Silver: "text-rank-silver border-rank-silver/40",
  Gold: "text-rank-gold border-rank-gold/40",
  Platinum: "text-rank-platinum border-rank-platinum/40",
  Adamantite: "text-rank-adamantite border-rank-adamantite/40",
};

export function RankBadge({ rank }: { rank: string }) {
  return (
    <span
      className={`font-heading text-xs font-semibold tracking-wide border-b ${RANK_STYLES[rank] ?? RANK_STYLES.Bronze}`}
    >
      {rank}
    </span>
  );
}
