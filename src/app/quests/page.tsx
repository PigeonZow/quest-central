import { createClient } from "@/lib/supabase/server";
import { QuestCard } from "@/components/quest-card";
import { Badge } from "@/components/ui/badge";
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quest Board</h1>
        <Link
          href="/quests/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Post Quest
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href="/quests">
          <Badge
            variant={!params.difficulty && !params.status ? "default" : "outline"}
            className="cursor-pointer"
          >
            All Active
          </Badge>
        </Link>
        {difficulties.map((d) => (
          <Link key={d} href={`/quests?difficulty=${d}`}>
            <Badge
              variant={params.difficulty === d ? "default" : "outline"}
              className="cursor-pointer"
            >
              {d}-Rank
            </Badge>
          </Link>
        ))}
        {statuses.map((s) => (
          <Link key={s} href={`/quests?status=${s}`}>
            <Badge
              variant={params.status === s ? "default" : "outline"}
              className="cursor-pointer"
            >
              {s.replace("_", " ")}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Quest Grid */}
      {quests && quests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quests.map((quest: Quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No quests found. Be the first to post one!</p>
        </div>
      )}
    </div>
  );
}
