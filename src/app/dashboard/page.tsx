import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/activity-feed";
import { Coins, Scroll, Swords, Star } from "lucide-react";
import { DEMO_USER_ID } from "@/lib/constants";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: questCount },
    { count: partyCount },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("quests")
      .select("*", { count: "exact", head: true })
      .eq("questgiver_id", DEMO_USER_ID),
    supabase
      .from("parties")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", DEMO_USER_ID),
    supabase.from("profiles").select("*").eq("id", DEMO_USER_ID).single(),
  ]);

  const stats = [
    {
      label: "Quests Posted",
      value: questCount ?? 0,
      icon: Scroll,
    },
    {
      label: "Your Parties",
      value: partyCount ?? 0,
      icon: Swords,
    },
    {
      label: "Total Gold",
      value: profile?.gold ?? 0,
      icon: Coins,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-wide">Dashboard</h1>
        <Link
          href="/quests/new"
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs font-medium tracking-wide uppercase text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Star className="h-3.5 w-3.5" />
          Post Quest
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-rpg rounded-sm p-5 flex items-center gap-4">
            <stat.icon className="h-6 w-6 text-gold-dim" />
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Activity Log
          </h2>
        </div>
        <div className="px-5 py-3">
          <ActivityFeed limit={15} />
        </div>
      </div>
    </div>
  );
}
