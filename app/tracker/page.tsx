import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Phase, DailyLog, Reminder } from "@/lib/types";
import { TrackerClient } from "@/components/tracker/TrackerClient";
import { APP_VERSION } from "@/lib/version";
import TrackerLoading from "./loading";

export const dynamic = "force-dynamic";

async function TrackerContent() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [phasesRes, logsRes, remindersRes] = await Promise.all([
    supabase.from("phases").select("*").eq("user_id", user.id).order("phase_number"),
    supabase.from("daily_logs").select("id, project_id, user_id, log_date, phase_id, description, weather, work_status, issues, resolution, deliverable_name, photos, created_at").eq("user_id", user.id).order("log_date", { ascending: false }).limit(100),
    supabase.from("reminders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex-1 overflow-y-auto mb-safe pt-2">
      <TrackerClient
        phases={(phasesRes.data ?? []) as Phase[]}
        logs={(logsRes.data ?? []) as DailyLog[]}
        initialReminders={(remindersRes.data ?? []) as Reminder[]}
      />
      <div className="pt-8 pb-16 text-center shrink-0">
        <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Tracker</h1>
      </div>
      <Suspense fallback={<TrackerLoading />}>
        <TrackerContent />
      </Suspense>
    </div>
  );
}
