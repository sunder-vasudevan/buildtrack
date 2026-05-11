import { supabase } from "@/lib/supabase";
import { DailyLog, Phase } from "@/lib/types";
import { LogsClient } from "./LogsClient";

export default async function LogsPage() {
  const [logsRes, phasesRes] = await Promise.all([
    supabase.from("daily_logs").select("*").order("log_date", { ascending: false }),
    supabase.from("phases").select("id, name").order("phase_number"),
  ]);
  return (
    <LogsClient
      initialLogs={(logsRes.data ?? []) as DailyLog[]}
      phases={(phasesRes.data ?? []) as Pick<Phase, "id" | "name">[]}
    />
  );
}
