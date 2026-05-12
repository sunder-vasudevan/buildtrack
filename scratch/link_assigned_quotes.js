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
  console.log("Fetching all phases...");
  const { data: phases, error: pErr } = await supabase.from("phases").select("id, name, phase_number");
  if (pErr) {
    console.error("Error fetching phases:", pErr);
    return;
  }

  // Find target phase IDs by phase_number or name matching
  const findPhase = (phaseNum) => phases.find(p => p.phase_number === phaseNum)?.id;
  const findPhaseByName = (namePart) => phases.find(p => p.name.toLowerCase().includes(namePart.toLowerCase()))?.id;

  const phase0Id = findPhase(0); // Phase 0: Site Prep & Foundation
  const phase1Id = findPhase(1); // Phase 1: Foundation Footings & Columns
  const phase1BId = findPhase(2); // Phase 1B: Walls & Brickwork
  const phaseRoofId = findPhase(3); // MILESTONE: ROOF STRUCTURE
  const phaseMEPId = findPhase(5); // Phase 3: MEP Rough-in
  const phaseFlooringId = findPhase(6); // Phase 4: Flooring & Fixtures
  const phaseTestingId = findPhase(7); // Phase 5: Testing, Cleanup & Handover

  console.log("Resolved Phase IDs:");
  console.log("- Phase 0:", phase0Id);
  console.log("- Phase 1:", phase1Id);
  console.log("- Phase 1B:", phase1BId);
  console.log("- Phase Roof:", phaseRoofId);
  console.log("- Phase MEP:", phaseMEPId);
  console.log("- Phase Flooring:", phaseFlooringId);
  console.log("- Phase Testing:", phaseTestingId);

  // Fetch all budget items
  const { data: items, error: iErr } = await supabase.from("budget_items").select("id, item_name");
  if (iErr) {
    console.error("Error fetching items:", iErr);
    return;
  }

  // List of updates to make
  const updates = [];

  for (const item of items) {
    const name = item.item_name.toLowerCase();

    // 1. Phase 0: Site Prep & Foundation
    if (name.includes("jcb") || name.includes("mud / soil") || name.includes("transformer meter")) {
      updates.push({ id: item.id, phase_id: phase0Id });
    }
    // 2. Phase 1: Foundation Footings & Columns
    else if (name === "sand" || name.includes("basement stone")) {
      updates.push({ id: item.id, phase_id: phase1Id });
    }
    // 3. Phase 1B: Walls & Brickwork
    else if (name === "bricks") {
      updates.push({ id: item.id, phase_id: phase1BId });
    }
    // 4. Milestone: Roof Structure
    else if (name.includes("centring")) {
      updates.push({ id: item.id, phase_id: phaseRoofId });
    }
    // 5. Phase 3: MEP Rough-in
    else if (name.includes("plumber") || name.includes("plumbing") || name.includes("electrical system") || name.includes("drainage") || name.includes("service wire")) {
      updates.push({ id: item.id, phase_id: phaseMEPId });
    }
    // 6. Phase 4: Flooring & Fixtures (includes UPVC & Doors as per user instructions!)
    else if (
      name.includes("upvc") ||
      name.includes("door") || 
      name.includes("flooring") || 
      name.includes("tiles") || 
      name.includes("fixtures") || 
      name.includes("paint") || 
      name.includes("color")
    ) {
      updates.push({ id: item.id, phase_id: phaseFlooringId });
    }
    // 7. Phase 5: Testing, Cleanup & Handover
    else if (name.includes("water supply system")) {
      updates.push({ id: item.id, phase_id: phaseTestingId });
    }
  }

  console.log(`\nFound ${updates.length} items to update...`);

  // Run database updates in parallel
  await Promise.all(
    updates.map(up => 
      supabase.from("budget_items").update({ phase_id: up.phase_id }).eq("id", up.id)
    )
  );

  console.log("Successfully completed mapping updates!");
}

run();
