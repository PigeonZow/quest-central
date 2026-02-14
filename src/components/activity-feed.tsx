"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ActivityEntry {
  id: string;
  event_type: string;
  party_id: string | null;
  quest_id: string | null;
  details: Record<string, string>;
  created_at: string;
  party?: { name: string } | null;
  quest?: { title: string } | null;
}

function formatMessage(entry: ActivityEntry): string {
  const partyName = entry.party?.name ?? entry.details?.party_name ?? "A party";
  const questTitle = entry.quest?.title ?? entry.details?.title ?? "a quest";

  switch (entry.event_type) {
    case "quest_posted":
      return `New quest posted: "${questTitle}"`;
    case "quest_accepted":
      return `${partyName} accepted "${questTitle}"`;
    case "quest_submitted":
      return `${partyName} submitted results for "${questTitle}"`;
    case "quest_scored":
      return `"${questTitle}" has been scored`;
    case "quest_completed":
      return `Quest completed: "${questTitle}"`;
    case "rank_up":
      return `${partyName} ranked up to ${entry.details?.new_rank ?? "a new rank"}!`;
    default:
      return entry.event_type;
  }
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const EVENT_ICONS: Record<string, string> = {
  quest_posted: "📜",
  quest_accepted: "⚔️",
  quest_submitted: "📨",
  quest_scored: "⭐",
  quest_completed: "🏆",
  rank_up: "🎖️",
};

export function ActivityFeed({ limit = 15 }: { limit?: number }) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    // Load initial
    supabase
      .from("activity_log")
      .select("*, party:parties(name), quest:quests(title)")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setActivities(data as ActivityEntry[]);
      });

    // Subscribe to new entries
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        async (payload) => {
          const newEntry = payload.new as ActivityEntry;

          // Fetch joined party/quest names
          if (newEntry.party_id) {
            const { data: party } = await supabase
              .from("parties")
              .select("name")
              .eq("id", newEntry.party_id)
              .single();
            if (party) newEntry.party = party;
          }
          if (newEntry.quest_id) {
            const { data: quest } = await supabase
              .from("quests")
              .select("title")
              .eq("id", newEntry.quest_id)
              .single();
            if (quest) newEntry.quest = quest;
          }

          setNewIds((prev) => new Set([...prev, newEntry.id]));
          setActivities((prev) => [newEntry, ...prev.slice(0, limit - 1)]);

          // Remove animation class after 2s
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(newEntry.id);
              return next;
            });
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No activity yet. Post a quest or register a party to get started!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 transition-all duration-500 ${
            newIds.has(entry.id)
              ? "bg-gold/10 -mx-2 px-2 rounded"
              : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-xs">{EVENT_ICONS[entry.event_type] ?? "📌"}</span>
            <span>{formatMessage(entry)}</span>
          </span>
          <span className="text-xs text-muted-foreground shrink-0 ml-4">
            {getTimeAgo(entry.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
