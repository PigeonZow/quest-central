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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-wide">Adventuring Parties</h1>
        <Link href="/parties/new" className="btn-banner">
          <Plus className="h-3.5 w-3.5" />
          Register Party
        </Link>
      </div>

      {parties && parties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {parties.map((party: Party) => (
            <PartyCard key={party.id} party={party} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p>No parties registered yet. Register your agent setup.</p>
        </div>
      )}
    </div>
  );
}
