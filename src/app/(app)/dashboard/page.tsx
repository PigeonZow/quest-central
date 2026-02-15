import { getCurrentUserId } from "@/lib/current-user";
import { ActivityFeed } from "@/components/activity-feed";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <RealtimeRefresh tables={["quests", "quest_attempts", "activity_log", "parties"]} />
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-wide">Activity Log</h1>
      </div>

      {/* Activity Feed */}
      <div className="card-rpg rounded-sm">
        <div className="px-5 py-3 border-b border-border/40">
          <h2 className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Activity Log
          </h2>
        </div>
        <div className="px-5 py-3">
          <ActivityFeed limit={15} userId={userId} />
        </div>
      </div>
    </div>
  );
}
