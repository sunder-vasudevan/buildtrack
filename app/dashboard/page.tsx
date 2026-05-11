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



      {/* Budget Overview */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Budget</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            budgetColor === "red" ? "bg-red-100 text-red-700" :
            budgetColor === "orange" ? "bg-orange-100 text-orange-700" :
            "bg-emerald-100 text-emerald-700"
          }`}>
            {spentPct.toFixed(0)}% used
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${
              budgetColor === "red" ? "bg-red-500" :
              budgetColor === "orange" ? "bg-orange-400" :
              "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(spentPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Spent: <span className="font-semibold text-gray-800">{formatINR(spent)}</span></span>
          <span>Budget: <span className="font-semibold text-gray-800">{formatINR(totalBudget)}</span></span>
        </div>
        {remaining < 0 && (
          <p className="text-xs font-semibold text-red-600">Over budget by {formatINR(Math.abs(remaining))}</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-emerald-600" />}
          label="Total Funds"
          value={formatINR(totalIncome)}
          sub={totalIncome === 0 ? "No funds added" : "Capital received"}
          color="emerald"
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
          label="Days Left"
          value={days > 0 ? `${days}d` : "Overdue"}
          sub={varianceText}
          color="blue"
          badge={varianceBadge}
        />
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-orange-600" />}
          label="Spent"
          value={formatINR(spent)}
          sub={spent === 0 ? "No actuals yet" : "Total to date"}
          color="orange"
        />
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-purple-600" />}
          label="Planned"
          value={formatINR(totalBudget)}
          sub="Total project budget"
          color="purple"
        />
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

