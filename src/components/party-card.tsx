import Link from "next/link";
import { RankBadge } from "./rank-badge";
import { Progress } from "@/components/ui/progress";
import { ARCHITECTURE_LABELS } from "@/lib/constants";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Target, Zap } from "lucide-react";
import type { Party } from "@/lib/types";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-green-600/80",
    scanning: "bg-green-600/80 animate-pulse",
    active: "bg-gold/80 animate-pulse",
    resting: "bg-muted-foreground/40",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status] ?? colors.idle}`} />;
}

export function PartyCard({ party }: { party: Party }) {
  const { progress } = rpToNextRank(party.rank, party.rp);
  const winRate =
    party.quests_completed > 0
      ? Math.round(
          (party.quests_completed /
            (party.quests_completed + party.quests_failed)) *
            100
        )
      : 0;

  return (
    <Link href={`/parties/${party.id}`}>
      <div className="quest-card rounded-sm p-4 cursor-pointer">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <StatusDot status={party.status} />
            <h3 className="font-heading text-sm font-semibold text-foreground">{party.name}</h3>
          </div>
          <RankBadge rank={party.rank} />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
          {ARCHITECTURE_LABELS[party.architecture_type] ?? party.architecture_type}
        </p>

        {/* RP Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{party.rp} RP</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-gold-dim" />
            {party.quests_completed}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {winRate}%
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {party.avg_score}
          </span>
        </div>
      </div>
    </Link>
  );
}
