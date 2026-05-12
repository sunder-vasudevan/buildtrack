import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envPath = ".env.local";
let SUPABASE_URL = "";
let SUPABASE_KEY = "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) SUPABASE_URL = line.split("=")[1].trim();
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) SUPABASE_KEY = line.split("=")[1].trim();
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: items, error } = await supabase
    .from("budget_items")
    .select("id, item_name, category, phase_id, notes");

  if (error) {
    console.error("Error fetching items:", error);
    return;
  }

  const unlinked = items.filter(i => !i.phase_id);
  console.log(`\n--- UNLINKED BUDGET ITEMS (${unlinked.length}) ---`);
  unlinked.forEach(i => {
    console.log(`- ID: ${i.id} | NAME: "${i.item_name}" | CAT: "${i.category}" | NOTES: "${i.notes || ''}"`);
  });

  const linked = items.filter(i => i.phase_id);
  console.log(`\n--- LINKED BUDGET ITEMS (${linked.length}) ---`);
  linked.forEach(i => {
    console.log(`- NAME: "${i.item_name}" | PHASE_ID: ${i.phase_id}`);
  });
}

run();
