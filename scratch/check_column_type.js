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

async function check() {
  // We can run an RPC or fetch information schema if allowed, or we can check what happens when we update deliverables with objects.
  const { data: phases } = await supabase.from("phases").select("*").limit(1);
  console.log("PHASES DELIVERABLES:", phases?.[0]?.deliverables);
  
  // Try to update with an object to see if it succeeds (which proves it is JSONB) or fails (which proves it is TEXT[])
  if (phases?.[0]) {
    const testId = phases[0].id;
    console.log("Testing update with object array...");
    const { error } = await supabase.from("phases").update({
      deliverables: [{ name: "Test Deliverable", planned_start: "2026-05-12", planned_due: null, actual_due: null }]
    }).eq("id", testId);
    if (error) {
      console.log("UPDATE FAILED (Column is likely TEXT[]):", error.message);
    } else {
      console.log("UPDATE SUCCEEDED (Column is JSONB!)");
      // Revert test
      await supabase.from("phases").update({ deliverables: phases[0].deliverables }).eq("id", testId);
    }
  }
}

check();
