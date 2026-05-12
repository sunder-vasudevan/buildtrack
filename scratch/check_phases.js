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
  const { data, error } = await supabase.from("phases").select("id, name, deliverables").limit(1).single();
  console.log("PHASE:", data);
}

check();
