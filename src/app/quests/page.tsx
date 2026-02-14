import { createClient } from "@/lib/supabase/server";
import { QuestCard } from "@/components/quest-card";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Quest } from "@/lib/types";

export default async function QuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("quests")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.difficulty) {
    query = query.eq("difficulty", params.difficulty);
  }
  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  } else {
    query = query.in("status", ["open", "in_progress", "review"]);
  }

  const { data: quests } = await query;

  const difficulties = ["C", "B", "A", "S"];
  const statuses = ["open", "in_progress", "review", "completed"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-wide">Quest Board</h1>
        <Link href="/quests/new" className="btn-banner">
          <Plus className="h-3.5 w-3.5" />
          Post Quest
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/quests">
          <span
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border rounded-sm cursor-pointer transition-colors ${
              !params.difficulty && !params.status
                ? "border-gold/40 text-gold bg-gold/5"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            All Active
          </span>
        </Link>
        {difficulties.map((d) => (
          <Link key={d} href={`/quests?difficulty=${d}`}>
            <span
              className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border rounded-sm cursor-pointer transition-colors ${
                params.difficulty === d
                  ? "border-gold/40 text-gold bg-gold/5"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {d}-Rank
            </span>
          </Link>
        ))}
        <span className="w-px h-5 bg-border self-center mx-1" />
        {statuses.map((s) => (
          <Link key={s} href={`/quests?status=${s}`}>
            <span
              className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border rounded-sm cursor-pointer transition-colors ${
                params.status === s
                  ? "border-gold/40 text-gold bg-gold/5"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {s.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>

      {/* Quest Grid */}
      {quests && quests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quests.map((quest: Quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p>No quests found. Be the first to post one.</p>
        </div>
      )}
    </div>
  );
}
