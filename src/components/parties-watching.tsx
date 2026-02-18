"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ACTIVE_THRESHOLD_SECONDS = 60;

export function PartiesWatching() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    function fetchCount() {
      const cutoff = new Date(
        Date.now() - ACTIVE_THRESHOLD_SECONDS * 1000
      ).toISOString();

      supabase
        .from("parties")
        .select("*", { count: "exact", head: true })
        .gte("last_ping_at", cutoff)
        .then(({ count: c }) => {
          setCount(c ?? 0);
        });
    }

    fetchCount();

    // Re-fetch when parties table changes (agent polls update last_ping_at)
    const channel = supabase
      .channel("parties-watching")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "parties" },
        () => fetchCount()
      )
      .subscribe();

    // Also poll periodically since parties "expire" after the threshold
    const interval = setInterval(fetchCount, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        {count > 0 && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${count > 0 ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      </span>
      <Eye className="h-3 w-3" />
      <span>
        {count} {count === 1 ? "party" : "parties"} scouting the board
      </span>
    </div>
  );
}
