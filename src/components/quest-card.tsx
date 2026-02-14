import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "./difficulty-badge";
import { Coins, Clock, Users } from "lucide-react";
import type { Quest } from "@/lib/types";

export function QuestCard({ quest }: { quest: Quest }) {
  return (
    <Link href={`/quests/${quest.id}`}>
      <Card className="border-border hover:border-gold/30 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {quest.title}
            </CardTitle>
            <DifficultyBadge difficulty={quest.difficulty} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {quest.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-gold" />
              {quest.gold_reward} gold
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {quest.max_attempts} max
            </span>
            {quest.time_limit_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {quest.time_limit_minutes}m
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              {quest.category}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
