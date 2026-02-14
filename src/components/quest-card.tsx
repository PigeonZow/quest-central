import Link from "next/link";
import { DifficultyBadge } from "./difficulty-badge";
import { Coins, Clock, Users } from "lucide-react";
import type { Quest } from "@/lib/types";

export function QuestCard({ quest }: { quest: Quest }) {
  return (
    <Link href={`/quests/${quest.id}`}>
      <div className="quest-card rounded-sm p-4 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading text-sm font-semibold leading-tight text-foreground">
            {quest.title}
          </h3>
          <DifficultyBadge difficulty={quest.difficulty} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {quest.description}
        </p>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coins className="h-3 w-3 text-gold-dim" />
            {quest.gold_reward}g
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {quest.max_attempts}
          </span>
          {quest.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {quest.time_limit_minutes}m
            </span>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
            {quest.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
