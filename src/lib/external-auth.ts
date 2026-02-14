import { createServiceClient } from "@/lib/supabase/server";
import type { Party } from "@/lib/types";

export async function authenticateParty(
  request: Request
): Promise<{ party: Party | null; error: string | null }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { party: null, error: "Missing or invalid Authorization header" };
  }
  const apiKey = authHeader.slice(7);

  const supabase = await createServiceClient();
  const { data: party, error } = await supabase
    .from("parties")
    .select("*")
    .eq("api_key", apiKey)
    .single();

  if (error || !party) {
    return { party: null, error: "Invalid API key" };
  }
  return { party: party as Party, error: null };
}
