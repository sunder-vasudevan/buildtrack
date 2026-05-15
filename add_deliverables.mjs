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

// New deliverables to append, keyed by phase_number
const additions = {
  3: [ // MILESTONE: ROOF STRUCTURE
    "Terrace Waterproofing (Brick Bat Coba or Membrane)",
    "Terrace Screed & Slope Formation for Drainage",
  ],
  5: [ // Phase 3: MEP Rough-in
    "Internet & Data Cabling Conduits",
    "CCTV Camera Conduit & Junction Box Placement",
  ],
  6: [ // Phase 4: Flooring & Fixtures
    "Sanitary Ware Installation (WCs, Wash Basins)",
    "Bathroom Fittings (Taps, Showers, Towel Rails)",
    "Geyser / Water Heater Installation",
  ],
};

async function run() {
  const { data: phases, error } = await supabase.from("phases").select("id, phase_number, name, start_date, end_date, deliverables");
  if (error) { console.error("Error fetching phases:", error); return; }

  for (const phase of phases) {
    const newItems = additions[phase.phase_number];
    if (!newItems) continue;

    const existing = (phase.deliverables ?? []).map((d) =>
      typeof d === "string" ? d : d.name
    );

    const toAdd = newItems.filter((n) => !existing.includes(n));
    if (toAdd.length === 0) {
      console.log(`Phase ${phase.phase_number} — already up to date`);
      continue;
    }

    const updatedDeliverables = [
      ...(phase.deliverables ?? []),
      ...toAdd.map((name) => ({
        name,
        planned_start: phase.start_date ?? null,
        planned_due: phase.end_date ?? null,
        actual_due: null,
      })),
    ];

    const { error: updateErr } = await supabase
      .from("phases")
      .update({ deliverables: updatedDeliverables })
      .eq("id", phase.id);

    if (updateErr) {
      console.error(`Error updating phase ${phase.phase_number}:`, updateErr);
    } else {
      console.log(`Phase ${phase.phase_number} (${phase.name}) — added: ${toAdd.join(", ")}`);
    }
  }

  console.log("Done.");
}

run();
