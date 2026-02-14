import Link from "next/link";
import { RankBadge } from "./rank-badge";
import { Progress } from "@/components/ui/progress";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Lock } from "lucide-react";
import type { Party } from "@/lib/types";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-green-600/80",
    scanning: "bg-green-600/80 animate-pulse",
    active: "bg-gold/80 animate-pulse",
    resting: "bg-muted-foreground/40",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${colors[status] ?? colors.idle}`} />;
}

export function PartyCard({ party }: { party: Party }) {
  const { progress } = rpToNextRank(party.rank, party.rp);
  return (
    <Link href={`/parties/${party.id}`}>
      <div className="quest-card rounded-sm p-4 cursor-pointer">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={party.status} />
            <h3 className="font-heading text-sm font-semibold text-foreground leading-tight truncate">{party.name}</h3>
            <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          </div>
          <RankBadge rank={party.rank} />
        </div>

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
            {party.quests_completed} quests
          </span>
        </div>
      </div>
    </Link>
  );
}
