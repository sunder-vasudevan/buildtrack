import { supabase } from "@/lib/supabase";
import { Phase } from "@/lib/types";
import { PhasesClient } from "./PhasesClient";

export default async function PhasesPage() {
  const { data } = await supabase.from("phases").select("*").order("phase_number");
  return <PhasesClient initialPhases={(data ?? []) as Phase[]} />;
}
