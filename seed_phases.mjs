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
    deliverables: ["Site cleared & leveled", "JCB work", "Excavation", "Footing layout"]
  },
  {
    phase_number: 1,
    name: "Phase 1: Foundation Footings & Columns",
    start_date: "2026-05-28",
    end_date: "2026-06-10",
    deliverables: ["Footings cast", "Columns & beams (RCC frame) complete", "Concrete finished"]
  },
  {
    phase_number: 2,
    name: "Phase 1B: Walls & Brickwork",
    start_date: "2026-06-11",
    end_date: "2026-06-14",
    deliverables: ["Brickwork complete (walls up to full height)"]
  },
  {
    phase_number: 3,
    name: "MILESTONE: ROOF STRUCTURE",
    start_date: "2026-06-15",
    end_date: "2026-06-15",
    deliverables: ["Centring formwork", "RCC slab or pitched roof casting complete", "Formwork removal", "Building WEATHERPROOF"]
  },
  {
    phase_number: 4,
    name: "Phase 2: Plastering & Finishes Base",
    start_date: "2026-06-16",
    end_date: "2026-07-31",
    deliverables: ["Internal & external wall plaster", "Flooring stone base", "Tile underlay", "All walls finished"]
  },
  {
    phase_number: 5,
    name: "Phase 3: MEP Rough-in",
    start_date: "2026-08-01",
    end_date: "2026-08-15",
    deliverables: ["Electrical conduit & wiring (concealed)", "Plumbing rough-in", "Water supply entry", "Drainage lines"]
  },
  {
    phase_number: 6,
    name: "Phase 4: Flooring & Fixtures",
    start_date: "2026-08-16",
    end_date: "2026-09-05",
    deliverables: ["Flooring tiles laid", "Bathroom & kitchen tiles", "Paint (interior & exterior)", "All fixtures installed"]
  },
  {
    phase_number: 7,
    name: "Phase 5: Testing, Cleanup & Handover",
    start_date: "2026-09-06",
    end_date: "2026-09-20",
    deliverables: ["Electrical testing & safety", "Plumbing pressure test", "Final cleanup", "Inspection & handover"]
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
