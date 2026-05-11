import { supabase } from "@/lib/supabase";
import * as Tabs from "@radix-ui/react-tabs";
import { Phase, DailyLog, PlanDocument } from "@/lib/types";
import { PhasesClient } from "@/components/tracker/PhasesTab";
import { LogsClient } from "@/components/tracker/LogsTab";
import { PlansTab } from "@/components/tracker/PlansTab";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const [phasesRes, logsRes, plansRes] = await Promise.all([
    supabase.from("phases").select("*").order("phase_number"),
    supabase.from("daily_logs").select("*").order("log_date", { ascending: false }),
    supabase.from("documents").select("*").order("created_at", { ascending: false }),
  ]);

  if (phasesRes.error) console.error(phasesRes.error);
  if (logsRes.error) console.error(logsRes.error);
  if (plansRes.error) console.error(plansRes.error);

  const phases = (phasesRes.data ?? []) as Phase[];
  const logs = (logsRes.data ?? []) as DailyLog[];
  const plans = (plansRes.data ?? []) as PlanDocument[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Tracker</h1>
      </div>

      <Tabs.Root defaultValue="phases" className="flex flex-col flex-1 mt-2">
        <Tabs.List className="flex border-b border-border bg-white rounded-t-xl overflow-hidden shrink-0">
          <Tabs.Trigger
            value="phases"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Phases
          </Tabs.Trigger>
          <Tabs.Trigger
            value="logs"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Logs
          </Tabs.Trigger>
          <Tabs.Trigger
            value="plans"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Plans
          </Tabs.Trigger>
        </Tabs.List>

        <div className="flex-1 bg-white rounded-b-xl border-x border-b border-border overflow-y-auto p-4 mb-safe">
          <Tabs.Content value="phases" className="outline-none h-full">
            <PhasesClient initialPhases={phases} />
          </Tabs.Content>
          <Tabs.Content value="logs" className="outline-none h-full">
            <LogsClient initialLogs={logs} phases={phases} />
          </Tabs.Content>
          <Tabs.Content value="plans" className="outline-none h-full">
            <PlansTab initialPlans={plans} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
