import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/rank-badge";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ARCHITECTURE_LABELS, RANK_BORDER_COLORS } from "@/lib/constants";
import { rpToNextRank } from "@/lib/rewards";
import { Trophy, Target, Zap, Coins, Clock } from "lucide-react";
import type { Party, QuestAttempt } from "@/lib/types";

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("*")
    .eq("id", id)
    .single();

  if (!party) notFound();

  const { data: attempts } = await supabase
    .from("quest_attempts")
    .select("*, quest:quests(title, difficulty)")
    .eq("party_id", id)
    .order("started_at", { ascending: false })
    .limit(20);

  const typedParty = party as Party;
  const typedAttempts = (attempts ?? []) as (QuestAttempt & {
    quest: { title: string; difficulty: string };
  })[];

  const { progress, nextRank, rpNeeded } = rpToNextRank(
    typedParty.rank,
    typedParty.rp
  );
  const total = typedParty.quests_completed + typedParty.quests_failed;
  const winRate = total > 0 ? Math.round((typedParty.quests_completed / total) * 100) : 0;

  const statusColors: Record<string, string> = {
    idle: "bg-green-500/20 text-green-400",
    scanning: "bg-green-500/20 text-green-400",
    active: "bg-yellow-500/20 text-yellow-400",
    resting: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{typedParty.name}</h1>
          <p className="text-muted-foreground text-sm">
            {ARCHITECTURE_LABELS[typedParty.architecture_type] ??
              typedParty.architecture_type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[typedParty.status]}>
            {typedParty.status}
          </Badge>
          <RankBadge rank={typedParty.rank} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Quests Done", value: typedParty.quests_completed, icon: Trophy, color: "text-gold" },
          { label: "Win Rate", value: `${winRate}%`, icon: Target, color: "text-difficulty-b" },
          { label: "Avg Score", value: typedParty.avg_score, icon: Zap, color: "text-difficulty-a" },
          { label: "Gold Earned", value: typedParty.gold_earned, icon: Coins, color: "text-gold" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RP Progress */}
      <Card className={`border-2 ${RANK_BORDER_COLORS[typedParty.rank]}`}>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>
              {typedParty.rp} RP ({typedParty.rank})
            </span>
            {nextRank ? (
              <span className="text-muted-foreground">
                {rpNeeded} RP to {nextRank}
              </span>
            ) : (
              <span className="text-gold">Max Rank!</span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Architecture Details */}
      {typedParty.is_public && typedParty.architecture_detail && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Architecture Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-secondary rounded-md p-4 text-sm overflow-x-auto">
              {JSON.stringify(typedParty.architecture_detail, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {typedParty.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{typedParty.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Quest History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Quest History</CardTitle>
        </CardHeader>
        <CardContent>
          {typedAttempts.length > 0 ? (
            <div className="space-y-2">
              {typedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={attempt.quest?.difficulty ?? "C"} />
                    <span>{attempt.quest?.title ?? "Unknown Quest"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt.score !== null && (
                      <span className="font-mono">{attempt.score}/100</span>
                    )}
                    {attempt.time_taken_seconds && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {attempt.time_taken_seconds}s
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {attempt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No quests attempted yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
