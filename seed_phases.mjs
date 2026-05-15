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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const data = [
  {
    phase_number: 0,
    name: "Phase 0: Site Prep & Foundation",
    start_date: "2026-05-14",
    end_date: "2026-05-27",
    deliverables: ["Site cleared & leveled", "JCB work", "Excavation", "Footing layout", "Temporary Electricity Meter Installation", "Excavation Shoring & Dewatering"]
  },
  {
    phase_number: 1,
    name: "Phase 1: Foundation Footings & Columns",
    start_date: "2026-05-28",
    end_date: "2026-06-10",
    deliverables: ["PCC Mud-mat Laying", "Footings cast", "Steel Rebar Tying & Inspection", "Columns & beams (RCC frame) complete", "Plinth Beam Casting", "Foundation Backfilling & Compaction", "DPC (Damp Proof Course) Layer", "Concrete finished"]
  },
  {
    phase_number: 2,
    name: "Phase 1B: Walls & Brickwork",
    start_date: "2026-06-11",
    end_date: "2026-06-14",
    deliverables: ["Door & Window Frame Fitting (Chowkats)", "Brickwork complete (walls up to full height)", "Lintel Beams & Chajja (Sunshade) Casting", "Sill Band Construction"]
  },
  {
    phase_number: 3,
    name: "MILESTONE: ROOF STRUCTURE",
    start_date: "2026-06-15",
    end_date: "2026-06-15",
    deliverables: ["Centring formwork", "Concealed Electrical Conduit Laying in Slab", "Fan Hooks & Junction Box Placement", "RCC slab or pitched roof casting complete", "Slab Concrete Curing (14-21 Days)", "Formwork removal", "Building WEATHERPROOF", "Terrace Waterproofing (Brick Bat Coba or Membrane)", "Terrace Screed & Slope Formation for Drainage"]
  },
  {
    phase_number: 4,
    name: "Phase 2: Plastering & Finishes Base",
    start_date: "2026-06-16",
    end_date: "2026-07-31",
    deliverables: ["Wall Chasing for Concealed Conduit", "Internal & external wall plaster", "Wet-area Waterproofing (Bathrooms & Balconies)", "External Waterproof Plastering Coat", "Wall Putty Base Coat (Putty 1 & 2)", "Flooring stone base", "Tile underlay", "All walls finished"]
  },
  {
    phase_number: 5,
    name: "Phase 3: MEP Rough-in",
    start_date: "2026-08-01",
    end_date: "2026-08-15",
    deliverables: ["Electrical conduit & wiring (concealed)", "Plumbing rough-in", "Water supply entry", "Drainage lines", "Septic Tank / Sewage Treatment Plant (STP)", "Rainwater Harvesting Pit (RWH)", "AC Concealed Copper Piping", "Internet & Data Cabling Conduits", "CCTV Camera Conduit & Junction Box Placement"]
  },
  {
    phase_number: 6,
    name: "Phase 4: Flooring & Fixtures",
    start_date: "2026-08-16",
    end_date: "2026-09-05",
    deliverables: ["Flooring tiles laid", "Bathroom & kitchen tiles", "Kitchen Granite Counter Countertop Fabrication", "UPVC/Aluminium Window Glass Frame Installation", "Carpentry, Wardrobes & Woodwork", "Main Gates, Window Grilles & Security Balustrades", "Paint (interior & exterior)", "All fixtures installed", "Sanitary Ware Installation (WCs, Wash Basins)", "Bathroom Fittings (Taps, Showers, Towel Rails)", "Geyser / Water Heater Installation"]
  },
  {
    phase_number: 7,
    name: "Phase 5: Testing, Cleanup & Handover",
    start_date: "2026-09-06",
    end_date: "2026-09-20",
    deliverables: ["Electrical testing & safety", "Plumbing pressure test", "Boundary Wall / Chainlink Security Fencing", "Overhead Water Tank & Pressure Pump", "Power Backup (Solar/Inverter/Generator)", "Landscape & Garden Development", "Final cleanup", "Inspection & handover"]
  }
];

async function seed() {
  console.log("Fetching project ID...");
  const { data: project, error: pErr } = await supabase.from("projects").select("id").limit(1).single();
  if (pErr) {
    console.error("Error fetching project:", pErr);
    return;
  }
  const projectId = project.id;

  console.log("Deleting existing phases...");
  await supabase.from("phases").delete().eq("project_id", projectId);

  console.log("Inserting new phases & milestones...");
  const payload = data.map((d) => ({
    ...d,
    project_id: projectId,
    status: "Not Started",
    deliverables: d.deliverables.map((name) => ({
      name,
      planned_start: d.start_date,
      planned_due: d.end_date,
      actual_due: null,
    })),
  }));

  // Update the first phase to be in progress since it's starting now
  payload[0].status = "In Progress";

  const { error: insErr } = await supabase.from("phases").insert(payload);
  if (insErr) {
    console.error("Error inserting phases:", insErr);
  } else {
    console.log("Successfully seeded phases!");
  }
}

seed();
