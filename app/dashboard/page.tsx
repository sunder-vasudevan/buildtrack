import { supabase } from "@/lib/supabase";
import { formatINR, daysLeft, formatDate } from "@/lib/utils";
import { BudgetItem, DailyLog, Project, Income, Phase, Reminder } from "@/lib/types";
import { CalendarDays, IndianRupee } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReminderWidget } from "@/components/dashboard/ReminderWidget";

async function getData() {
  const [projectRes, budgetRes, logsRes, incomeRes, phasesRes, remindersRes] = await Promise.all([
    supabase.from("projects").select("*").single(),
    supabase.from("budget_items").select("actual_cost, quoted_cost"),
    supabase.from("daily_logs").select("*").order("log_date", { ascending: false }).limit(3),
    supabase.from("income").select("amount"),
    supabase.from("phases").select("*").order("phase_number"),
    supabase.from("reminders").select("*").eq("done", false).order("due_date", { ascending: true }),
  ]);

  if (projectRes.error) console.error("Error fetching project:", projectRes.error);
  if (budgetRes.error) console.error("Error fetching budget:", budgetRes.error);
  if (logsRes.error) console.error("Error fetching logs:", logsRes.error);
  if (incomeRes.error && incomeRes.error.code !== "42P01") console.error("Error fetching income:", incomeRes.error);
  if (phasesRes.error) console.error("Error fetching phases:", phasesRes.error);
  if (remindersRes.error) console.error("Error fetching reminders:", remindersRes.error);

  return {
    project: projectRes.data as Project | null,
    budgetItems: (budgetRes.data ?? []) as Pick<BudgetItem, "actual_cost" | "quoted_cost">[],
    recentLogs: (logsRes.data ?? []) as DailyLog[],
    incomes: (incomeRes.data ?? []) as Pick<Income, "amount">[],
    phases: (phasesRes.data ?? []) as Phase[],
    reminders: (remindersRes.data ?? []) as Reminder[],
  };
}

export default async function DashboardPage() {
  const { project, budgetItems, recentLogs, incomes, phases, reminders } = await getData();

  const totalBudget = project?.total_budget ?? 21_74_500;
  const spent = budgetItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
  const totalIncome = incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const remaining = totalBudget - spent;
  const days = project ? daysLeft(project.end_date) : 0;

  let scheduleVariance = 0;
  let hasTracking = false;
  
  for (const p of phases) {
    if (p.status === "Completed" && p.actual_end_date) {
      const expected = new Date(p.end_date).getTime();
      const actual = new Date(p.actual_end_date).getTime();
      scheduleVariance += Math.round((actual - expected) / (1000 * 60 * 60 * 24));
      hasTracking = true;
    } else if (p.status === "In Progress" || p.status === "Delayed") {
      const expected = new Date(p.end_date).getTime();
      const today = new Date().getTime();
      if (today > expected) {
        scheduleVariance += Math.round((today - expected) / (1000 * 60 * 60 * 24));
      }
      hasTracking = true;
    }
  }

  const varianceText = project ? `Until ${formatDate(project.end_date)}` : "Sep 20, 2026";
  const spentPct = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
  const budgetColor = spentPct > 90 ? "red" : spentPct > 70 ? "orange" : "green";

  const varianceBadge = hasTracking
    ? scheduleVariance > 0
      ? { text: `+${scheduleVariance}d behind`, color: "red" as const }
      : scheduleVariance < 0
      ? { text: `${Math.abs(scheduleVariance)}d ahead`, color: "green" as const }
      : { text: "On schedule", color: "green" as const }
    : undefined;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Vasudha</h1>
        <p className="text-sm text-muted-foreground">Farmhouse — Hyderabad</p>
      </div>



      {/* Net Cash In Hand Banner (Health Indicator) */}
      {(() => {
        const netBalance = totalIncome - spent;
        if (netBalance >= 0) {
          return (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Net Cash In Hand</span>
                </div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">🟢 Capital Healthy</span>
              </div>
              <p className="text-2xl font-extrabold text-blue-900 font-sans">{formatINR(netBalance)}</p>
              <p className="text-xs text-blue-700/80">Site funds received exceed total actual expenditures to date.</p>
            </div>
          );
        } else {
          return (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm space-y-2 transition-all animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Net Cash Deficit</span>
                </div>
                <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">🚨 Over-spent Alert</span>
              </div>
              <p className="text-2xl font-extrabold text-red-900 font-sans">{formatINR(netBalance)}</p>
              <p className="text-xs text-red-700/80">Site expenditures exceed deposited capital by {formatINR(Math.abs(netBalance))}. Record capital logs!</p>
            </div>
          );
        }
      })()}

      {/* Modern 4-Grid Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 border border-border shadow-sm space-y-1">
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Project Budget</p>
          <p className="text-base font-extrabold text-gray-900 font-sans">{formatINR(totalBudget)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 shadow-sm space-y-1">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Funds Received</p>
          <p className="text-base font-extrabold text-emerald-800 font-sans">{formatINR(totalIncome)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 shadow-sm space-y-1">
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Total Spent</p>
          <p className="text-base font-extrabold text-orange-800 font-sans">{formatINR(spent)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 shadow-sm space-y-1 relative">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Days Left</p>
          <p className="text-base font-extrabold text-blue-800 font-sans">{days > 0 ? `${days}d` : "Overdue"}</p>
          {varianceBadge && (
            <span className={`absolute bottom-2.5 right-2.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
              varianceBadge.color === "red" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              {varianceBadge.text}
            </span>
          )}
        </div>
      </div>

      {/* Double Progress Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground font-semibold">
          <span>Spent of Capital: {totalIncome > 0 ? Math.round((spent / totalIncome) * 100) : 0}%</span>
          <span>Spent of Budget: {totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all ${spent > totalIncome ? "bg-red-500 animate-pulse" : "bg-orange-500"}`}
            style={{ width: `${Math.min(100, totalIncome > 0 ? (spent / totalIncome) * 100 : 0)}%` }}
          />
        </div>
        {spent > totalIncome && (
          <p className="text-[10px] font-semibold text-red-600">🚨 Site actual expenses exceed capital received by {formatINR(spent - totalIncome)}</p>
        )}
      </div>


      {/* Reminders widget */}
      <ReminderWidget initialReminders={reminders} />


      {/* Recent logs */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
        <h2 className="font-semibold text-sm text-gray-900">Recent Activity</h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs yet. Start tracking daily progress.</p>
        ) : (
          recentLogs.map((log) => (
            <div key={log.id} className="border-l-2 border-blue-200 pl-3 py-1">
              <p className="text-xs text-muted-foreground">{formatDate(log.log_date)}</p>
              <p className="text-sm text-gray-800 line-clamp-2">{log.description ?? "No description"}</p>
              {log.weather && <p className="text-xs text-muted-foreground mt-0.5">☀️ {log.weather}</p>}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-8 pb-16 text-center shrink-0">
        <p className="text-xs text-muted-foreground">v1.2.0 · Built in Hyderabad with ❤️</p>
      </div>
    </div>
  );
}

