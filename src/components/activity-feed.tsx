"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
  const questTitle = entry.quest?.title ?? entry.details?.title ?? entry.details?.quest_title ?? "a quest";

  switch (entry.event_type) {
    case "quest_posted":
      return `New quest posted: "${questTitle}"`;
    case "quest_accepted":
      return `${partyName} accepted "${questTitle}"`;
    case "quest_submitted": {
      const time = entry.details?.time_taken_seconds;
      return `${partyName} submitted results for "${questTitle}"${time ? ` (${time}s)` : ""}`;
    }
    case "quest_scored": {
      const feedback = entry.details?.feedback;
      return `Oracle evaluated ${partyName} on "${questTitle}"${feedback ? `: ${feedback.slice(0, 80)}${feedback.length > 80 ? "…" : ""}` : ""}`;
    }
    case "quest_completed":
      return `Quest completed: "${questTitle}"`;
    case "rank_up":
      return `${partyName} ranked up to ${entry.details?.new_rank ?? "a new rank"}! 🎖️`;
    default:
      return entry.event_type;
  }
}

function getEntryHref(entry: ActivityEntry): string | null {
  if (entry.event_type === "rank_up" && entry.party_id) {
    return `/parties/${entry.party_id}`;
  }
  if (entry.quest_id) {
    return `/quests/${entry.quest_id}`;
  }
  return null;
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
  quest_scored: "👁️",
  quest_completed: "🏆",
  rank_up: "🎖️",
};

export function ActivityFeed({ limit = 15, userId }: { limit?: number; userId?: string }) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [userPartyIds, setUserPartyIds] = useState<Set<string>>(new Set());
  const [userQuestIds, setUserQuestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // If userId provided, fetch their party IDs and quest IDs for filtering
      let partyIds = new Set<string>();
      let questIds = new Set<string>();

      if (userId) {
        const { data: userParties } = await supabase
          .from("parties")
          .select("id")
          .eq("owner_id", userId);
        if (userParties) {
          partyIds = new Set(userParties.map((p) => p.id));
        }

        const { data: userQuests } = await supabase
          .from("quests")
          .select("id")
          .eq("questgiver_id", userId);
        if (userQuests) {
          questIds = new Set(userQuests.map((q) => q.id));
        }

        setUserPartyIds(partyIds);
        setUserQuestIds(questIds);
      }

      // Build query — fetch more than limit so we can filter client-side
      let query = supabase
        .from("activity_log")
        .select("*, party:parties(name), quest:quests(title)")
        .order("created_at", { ascending: false });

      if (userId && (partyIds.size > 0 || questIds.size > 0)) {
        // Filter: party_id in user's parties OR quest_id in user's quests
        const filters: string[] = [];
        if (partyIds.size > 0) {
          filters.push(`party_id.in.(${[...partyIds].join(",")})`);
        }
        if (questIds.size > 0) {
          filters.push(`quest_id.in.(${[...questIds].join(",")})`);
        }
        query = query.or(filters.join(","));
      }

      const { data } = await query.limit(limit);
      if (data) setActivities(data as ActivityEntry[]);
    }

    load();

    // Subscribe to new entries
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        async (payload) => {
          const newEntry = payload.new as ActivityEntry;

          // Client-side filter for realtime events
          if (userId && userPartyIds.size + userQuestIds.size > 0) {
            const matchesParty = newEntry.party_id && userPartyIds.has(newEntry.party_id);
            const matchesQuest = newEntry.quest_id && userQuestIds.has(newEntry.quest_id);
            if (!matchesParty && !matchesQuest) return;
          }

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
  }, [limit, userId]);

  if (activities.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No activity yet. Post a quest or register a party to get started!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((entry) => {
        const href = getEntryHref(entry);
        const content = (
          <>
            <span className="flex items-center gap-2">
              <span className="text-[10px]">{EVENT_ICONS[entry.event_type] ?? "📌"}</span>
              <span className={`glow-text-wide text-muted-foreground ${newIds.has(entry.id) ? "glow-on" : ""}`}>
                {formatMessage(entry)}
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-4">
              {getTimeAgo(entry.created_at)}
            </span>
          </>
        );

        const className = `glow-row flex items-center justify-between text-xs py-2 border-b border-border/40 last:border-0 transition-all duration-500 ${
          href ? "cursor-pointer" : ""
        }`;

        return href ? (
          <Link key={entry.id} href={href} className={className}>
            {content}
          </Link>
        ) : (
          <div key={entry.id} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
