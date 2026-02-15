import Link from "next/link";
import { RankBadge } from "./rank-badge";
import { Lock } from "lucide-react";
import type { Party } from "@/lib/types";

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; labelClass: string }> = {
  idle: {
    label: "Idle",
    dotClass: "bg-green-600/80",
    labelClass: "text-green-600/80",
  },
  scanning: {
    label: "Scanning",
    dotClass: "bg-green-600/80 animate-pulse",
    labelClass: "text-green-600/80",
  },
  active: {
    label: "Active",
    dotClass: "bg-gold/80 animate-pulse",
    labelClass: "text-gold/80",
  },
  resting: {
    label: "Resting",
    dotClass: "bg-muted-foreground/40",
    labelClass: "text-muted-foreground/40",
  },
};

export function PartyCard({ party }: { party: Party }) {
  const status = STATUS_CONFIG[party.status] ?? STATUS_CONFIG.idle;

  return (
    <Link href={`/parties/${party.id}`}>
      <div className={`quest-card rounded-sm p-4 cursor-pointer${party.status === "active" ? " quest-card-active" : ""}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-heading text-sm font-semibold text-foreground leading-tight truncate">{party.name}</h3>
            <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          </div>
          <RankBadge rank={party.rank} />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${status.dotClass}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${status.labelClass}`}>
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
