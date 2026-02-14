"use client";

/**
 * RealtimeRefresh — subscribes to Supabase Realtime for specified tables
 * and calls router.refresh() on any change, keeping SSR pages live.
 *
 * Usage: Drop <RealtimeRefresh tables={["quests", "activity_log"]} /> into any page.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tables[0] },
        () => router.refresh()
      );

    // Subscribe to additional tables
    for (let i = 1; i < tables.length; i++) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tables[i] },
        () => router.refresh()
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, tables]);

  return null; // invisible component
}
