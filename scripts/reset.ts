import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reset() {
  console.log("Resetting Quest Central database...\n");

  // Delete in FK-safe order
  const tables = ["activity_log", "quest_attempts", "quests", "parties"];
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      console.error(`  Failed to clear ${table}: ${error.message}`);
    } else {
      console.log(`  Cleared: ${table}`);
    }
  }

  console.log("\nDone. Run `npm run seed` to repopulate.");
}

reset().catch(console.error);
