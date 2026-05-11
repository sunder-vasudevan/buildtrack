import { supabase } from "@/lib/supabase";
import { formatINR, daysLeft, formatDate } from "@/lib/utils";
import { BudgetItem, DailyLog, Project, Income } from "@/lib/types";
import { CalendarDays, IndianRupee } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

async function getData() {
  const [projectRes, budgetRes, logsRes, incomeRes] = await Promise.all([
    supabase.from("projects").select("*").single(),
    supabase.from("budget_items").select("actual_cost, quoted_cost"),
    supabase.from("daily_logs").select("*").order("log_date", { ascending: false }).limit(3),
    supabase.from("income").select("amount"),
  ]);

  if (projectRes.error) console.error("Error fetching project:", projectRes.error);
  if (budgetRes.error) console.error("Error fetching budget:", budgetRes.error);
  if (logsRes.error) console.error("Error fetching logs:", logsRes.error);
  if (incomeRes.error && incomeRes.error.code !== "42P01") console.error("Error fetching income:", incomeRes.error);

  return {
    project: projectRes.data as Project | null,
    budgetItems: (budgetRes.data ?? []) as Pick<BudgetItem, "actual_cost" | "quoted_cost">[],
    recentLogs: (logsRes.data ?? []) as DailyLog[],
    incomes: (incomeRes.data ?? []) as Pick<Income, "amount">[],
  };
}

export default async function DashboardPage() {
  const { project, budgetItems, recentLogs, incomes } = await getData();

  const totalBudget = project?.total_budget ?? 21_74_500;
  const spent = budgetItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
  const totalIncome = incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const remaining = totalBudget - spent;
  const days = project ? daysLeft(project.end_date) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Vasudha</h1>
        <p className="text-sm text-muted-foreground">Farmhouse — Hyderabad</p>
      </div>



      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-emerald-600" />}
          label="Total Income"
          value={formatINR(totalIncome)}
          sub={totalIncome === 0 ? "No funds added" : "Capital received"}
          color="emerald"
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
          label="Days Left"
          value={days > 0 ? `${days}d` : "Overdue"}
          sub={project ? `Until ${formatDate(project.end_date)}` : "Sep 20, 2026"}
          color="blue"
        />
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-orange-600" />}
          label="Spent"
          value={formatINR(spent)}
          sub={spent === 0 ? "No actuals yet" : "Total to date"}
          color="orange"
        />
      </div>


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
    </div>
  );
}

