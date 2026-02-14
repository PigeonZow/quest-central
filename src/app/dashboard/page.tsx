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
      color: "text-difficulty-a",
    },
    {
      label: "Your Parties",
      value: partyCount ?? 0,
      icon: Swords,
      color: "text-difficulty-b",
    },
    {
      label: "Total Gold",
      value: profile?.gold ?? 0,
      icon: Coins,
      color: "text-gold",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/quests/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Star className="h-4 w-4" />
            Post Quest
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Realtime Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed limit={15} />
        </CardContent>
      </Card>
    </div>
  );
}
