import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "./rank-badge";
import { Progress } from "@/components/ui/progress";
import { ARCHITECTURE_LABELS, RANK_BORDER_COLORS } from "@/lib/constants";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Target, Zap } from "lucide-react";
import type { Party } from "@/lib/types";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-green-500",
    scanning: "bg-green-500 animate-pulse",
    active: "bg-yellow-500 animate-pulse",
    resting: "bg-gray-500",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] ?? colors.idle}`} />;
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
      <Card
        className={`border-2 ${RANK_BORDER_COLORS[party.rank] ?? "border-border"} hover:shadow-lg hover:shadow-gold/5 transition-all cursor-pointer`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <StatusDot status={party.status} />
              <CardTitle className="text-base">{party.name}</CardTitle>
            </div>
            <RankBadge rank={party.rank} />
          </div>
          <p className="text-xs text-muted-foreground">
            {ARCHITECTURE_LABELS[party.architecture_type] ?? party.architecture_type}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* RP Progress */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{party.rp} RP</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-gold" />
                {party.quests_completed} done
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {winRate}% win
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {party.avg_score} avg
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
