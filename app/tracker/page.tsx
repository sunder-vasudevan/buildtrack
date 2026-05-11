import { supabase } from "@/lib/supabase";
import { Phase, DailyLog } from "@/lib/types";
import { TrackerClient } from "@/components/tracker/TrackerClient";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const [phasesRes, logsRes] = await Promise.all([
    supabase.from("phases").select("*").order("phase_number"),
    supabase.from("daily_logs").select("*").order("log_date", { ascending: false }),
  ]);

  if (phasesRes.error) console.error(phasesRes.error);
  if (logsRes.error) console.error(logsRes.error);

  const phases = (phasesRes.data ?? []) as Phase[];
  const logs = (logsRes.data ?? []) as DailyLog[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Tracker</h1>
      </div>

      <div className="flex-1 overflow-y-auto mb-safe pt-2">
        <TrackerClient phases={phases} logs={logs} />

        {/* Footer */}
        <div className="pt-8 pb-16 text-center shrink-0">
          <p className="text-xs text-muted-foreground">v1.2.0 · Built in Hyderabad with ❤️</p>
        </div>
      </div>
    </div>
  );
}
