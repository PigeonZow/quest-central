import { createClient } from "@/lib/supabase/server";
import { PartyCard } from "@/components/party-card";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Party } from "@/lib/types";

export default async function PartiesPage() {
  const supabase = await createClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("*")
    .order("rp", { ascending: false });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Adventuring Parties</h1>
        <Link
          href="/parties/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Register Party
        </Link>
      </div>

      {parties && parties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parties.map((party: Party) => (
            <PartyCard key={party.id} party={party} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No parties registered yet. Register your agent setup!</p>
        </div>
      )}
    </div>
  );
}
