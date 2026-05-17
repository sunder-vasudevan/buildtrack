import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { BudgetItem, DailyLog, Project, Income, Phase, Reminder } from "@/lib/types";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

async function getData() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const userId = user.id;

  const [projectRes, budgetRes, logsRes, incomeRes, phasesRes, remindersRes] = await Promise.all([
    supabase.from("projects").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("budget_items").select("*").eq("user_id", userId).order("category"),
    supabase.from("daily_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }).limit(3),
    supabase.from("income").select("*").eq("user_id", userId).order("date_received", { ascending: false }),
    supabase.from("phases").select("*").eq("user_id", userId).order("phase_number"),
    supabase.from("reminders").select("*").eq("user_id", userId).eq("done", false).order("due_date", { ascending: true }),
  ]);

  if (projectRes.error) console.error("Error fetching project:", projectRes.error);
  if (budgetRes.error) console.error("Error fetching budget:", budgetRes.error);
  if (logsRes.error) console.error("Error fetching logs:", logsRes.error);
  if (incomeRes.error && incomeRes.error.code !== "42P01") console.error("Error fetching income:", incomeRes.error);
  if (phasesRes.error) console.error("Error fetching phases:", phasesRes.error);
  if (remindersRes.error) console.error("Error fetching reminders:", remindersRes.error);

  return {
    project: projectRes.data as Project | null,
    budgetItems: (budgetRes.data ?? []) as BudgetItem[],
    recentLogs: (logsRes.data ?? []) as DailyLog[],
    incomes: (incomeRes.data ?? []) as Income[],
    phases: (phasesRes.data ?? []) as Phase[],
    reminders: (remindersRes.data ?? []) as Reminder[],
  };
}

export default async function DashboardPage() {
  const initialData = await getData();

  return <DashboardClient initialData={initialData} />;
}
