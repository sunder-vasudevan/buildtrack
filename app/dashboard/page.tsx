import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { BudgetItem, DailyLog, Project, Income, Phase, Reminder, Expense } from "@/lib/types";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import DashboardLoading from "./loading";

async function getData() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const userId = user.id;

  const [projectRes, budgetRes, logsRes, incomeRes, phasesRes, remindersRes, expensesRes] = await Promise.all([
    supabase.from("projects").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("budget_items").select("*").eq("user_id", userId).order("category"),
    supabase.from("daily_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }).limit(3),
    supabase.from("income").select("*").eq("user_id", userId).order("date_received", { ascending: false }),
    supabase.from("phases").select("*").eq("user_id", userId).order("phase_number"),
    supabase.from("reminders").select("*").eq("user_id", userId).eq("done", false).order("due_date", { ascending: true }),
    supabase.from("expenses").select("*").eq("user_id", userId).order("expense_date", { ascending: false }),
  ]);

  return {
    project: projectRes.data as Project | null,
    budgetItems: (budgetRes.data ?? []) as BudgetItem[],
    recentLogs: (logsRes.data ?? []) as DailyLog[],
    incomes: (incomeRes.data ?? []) as Income[],
    phases: (phasesRes.data ?? []) as Phase[],
    reminders: (remindersRes.data ?? []) as Reminder[],
    expenses: (expensesRes.data ?? []) as Expense[],
  };
}

async function DashboardContent() {
  const initialData = await getData();
  return <DashboardClient initialData={initialData} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
