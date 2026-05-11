import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load env vars manually
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const data = [
  // Vendor Quotes
  { item_name: "Civil Labour", category: "Vendor Quotes", quoted_cost: 300000 },
  { item_name: "Iron / Steel", category: "Vendor Quotes", quoted_cost: 280000 },
  { item_name: "Centring (includes Roofing)", category: "Vendor Quotes", quoted_cost: 200000 },
  { item_name: "Sand", category: "Vendor Quotes", quoted_cost: 150000 },
  { item_name: "Wood/Doors", category: "Vendor Quotes", quoted_cost: 100000 },
  { item_name: "UPVC Windows", category: "Vendor Quotes", quoted_cost: 100000 },
  { item_name: "Flooring Stones", category: "Vendor Quotes", quoted_cost: 90000 },
  { item_name: "Bricks", category: "Vendor Quotes", quoted_cost: 70000 },
  { item_name: "Plumber (Labour)", category: "Vendor Quotes", quoted_cost: 50000 },
  { item_name: "Plumbing (Material)", category: "Vendor Quotes", quoted_cost: 50000 },
  { item_name: "Paint", category: "Vendor Quotes", quoted_cost: 40000 },
  { item_name: "Misc. Expense (TBC)", category: "Vendor Quotes", quoted_cost: 40000 },
  { item_name: "Mud / Soil", category: "Vendor Quotes", quoted_cost: 40000 },
  { item_name: "Kankara", category: "Vendor Quotes", quoted_cost: 40000 },
  { item_name: "Tiles", category: "Vendor Quotes", quoted_cost: 35000 },
  { item_name: "Basement Stone", category: "Vendor Quotes", quoted_cost: 35000 },
  { item_name: "Setting / Finishing", category: "Vendor Quotes", quoted_cost: 20000 },
  { item_name: "JCB (Equipment Rental)", category: "Vendor Quotes", quoted_cost: 15000 },
  { item_name: "Bathroom Tiles", category: "Vendor Quotes", quoted_cost: 25000 },
  { item_name: "Color", category: "Vendor Quotes", quoted_cost: 15000 },
  
  // Additional Items Required
  { item_name: "Electrical System (Wiring, Switches, Lights, Distribution Board)", category: "Additional Items", quoted_cost: 55000 },
  { item_name: "Bathroom Fixtures & Installation (WC, Basin, Mixer, Tiles, Labor)", category: "Additional Items", quoted_cost: 38000 },
  { item_name: "Kitchen Fixtures & Installation (Sink, Tap, Gas Connection)", category: "Additional Items", quoted_cost: 16500 },
  { item_name: "Water Supply System (Overhead Tank 1000L + Pump)", category: "Additional Items", quoted_cost: 50000 },
  { item_name: "Drainage & Sewage System (Septic Tank + Drain Connections)", category: "Additional Items", quoted_cost: 80000 },
  { item_name: "Door/Window Installation Labour", category: "Additional Items", quoted_cost: 40000 },
  { item_name: "Contingency Buffer (5%)", category: "Additional Items", quoted_cost: 100000 },
];

async function seed() {
  console.log("Fetching project ID...");
  const { data: project, error: pErr } = await supabase.from("projects").select("id").limit(1).single();
  if (pErr) {
    console.error("Error fetching project:", pErr);
    return;
  }
  const projectId = project.id;
  console.log("Project ID:", projectId);

  console.log("Deleting existing budget items...");
  const { error: delErr } = await supabase.from("budget_items").delete().eq("project_id", projectId);
  if (delErr) {
    console.error("Error deleting items:", delErr);
    return;
  }

  console.log("Updating total_budget on project...");
  const grandTotal = 2074500;
  await supabase.from("projects").update({ total_budget: grandTotal }).eq("id", projectId);

  console.log("Inserting new budget estimates...");
  const payload = data.map((d) => ({
    ...d,
    project_id: projectId,
    actual_cost: 0,
    status: "Pending",
  }));

  const { error: insErr } = await supabase.from("budget_items").insert(payload);
  if (insErr) {
    console.error("Error inserting items:", insErr);
  } else {
    console.log("Successfully seeded budget estimates!");
  }
}

seed();
