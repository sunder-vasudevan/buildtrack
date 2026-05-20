import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Phase, DailyLog, Reminder } from "@/lib/types";
import { TrackerClient } from "@/components/tracker/TrackerClient";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [phasesRes, logsRes, remindersRes] = await Promise.all([
    supabase.from("phases").select("*").eq("user_id", user.id).order("phase_number"),
    supabase.from("daily_logs").select("id, project_id, user_id, log_date, phase_id, description, weather, work_status, issues, resolution, deliverable_name, photos, created_at").eq("user_id", user.id).order("log_date", { ascending: false }).limit(100),
    supabase.from("reminders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  if (phasesRes.error) console.error(phasesRes.error);
  if (logsRes.error) console.error(logsRes.error);
  if (remindersRes.error) console.error(remindersRes.error);

  const phases = (phasesRes.data ?? []) as Phase[];
  const logs = (logsRes.data ?? []) as DailyLog[];
  const reminders = (remindersRes.data ?? []) as Reminder[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Tracker</h1>
      </div>

      <div className="flex-1 overflow-y-auto mb-safe pt-2">
        <TrackerClient phases={phases} logs={logs} initialReminders={reminders} />

        <div className="pt-8 pb-16 text-center shrink-0">
          <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
