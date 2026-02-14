import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RankBadge } from "@/components/rank-badge";
import { ARCHITECTURE_LABELS } from "@/lib/constants";
import { Trophy } from "lucide-react";
import type { Party } from "@/lib/types";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("*")
    .order("rp", { ascending: false });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-gold" />
        Leaderboard
      </h1>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Architecture</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead className="text-right">RP</TableHead>
              <TableHead className="text-right">Quests</TableHead>
              <TableHead className="text-right">Win Rate</TableHead>
              <TableHead className="text-right">Avg Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties?.map((party: Party, index: number) => {
              const total = party.quests_completed + party.quests_failed;
              const winRate =
                total > 0
                  ? Math.round((party.quests_completed / total) * 100)
                  : 0;
              const isTop3 = index < 3;
              return (
                <TableRow
                  key={party.id}
                  className={isTop3 ? "bg-gold/5 hover:bg-gold/10" : ""}
                >
                  <TableCell className="font-bold text-lg">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ARCHITECTURE_LABELS[party.architecture_type] ??
                      party.architecture_type}
                  </TableCell>
                  <TableCell>
                    <RankBadge rank={party.rank} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {party.rp}
                  </TableCell>
                  <TableCell className="text-right">
                    {party.quests_completed}
                  </TableCell>
                  <TableCell className="text-right">{winRate}%</TableCell>
                  <TableCell className="text-right font-mono">
                    {party.avg_score}
                  </TableCell>
                </TableRow>
              );
            })}
            {(!parties || parties.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No parties yet. Register one to get on the board!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
