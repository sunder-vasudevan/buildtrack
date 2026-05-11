import { supabase } from "@/lib/supabase";
import { formatINR, daysLeft, formatDate } from "@/lib/utils";
import { Phase, Window, BudgetItem, DailyLog, Project } from "@/lib/types";
import { AlertTriangle, CalendarDays, IndianRupee, SquareStack } from "lucide-react";

async function getData() {
  const [projectRes, phasesRes, windowsRes, budgetRes, logsRes] = await Promise.all([
    supabase.from("projects").select("*").single(),
    supabase.from("phases").select("*").order("phase_number"),
    supabase.from("windows").select("id, status"),
    supabase.from("budget_items").select("actual_cost, quoted_cost"),
    supabase.from("daily_logs").select("*").order("log_date", { ascending: false }).limit(3),
  ]);
  return {
    project: projectRes.data as Project | null,
    phases: (phasesRes.data ?? []) as Phase[],
    windows: (windowsRes.data ?? []) as Pick<Window, "id" | "status">[],
    budgetItems: (budgetRes.data ?? []) as Pick<BudgetItem, "actual_cost" | "quoted_cost">[],
    recentLogs: (logsRes.data ?? []) as DailyLog[],
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Not Started": "bg-gray-100 text-gray-600",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Delayed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const { project, phases, windows, budgetItems, recentLogs } = await getData();

  const totalBudget = project?.total_budget ?? 21_74_500;
  const spent = budgetItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
  const remaining = totalBudget - spent;
  const days = project ? daysLeft(project.end_date) : 0;
  const windowsInstalled = windows.filter((w) => w.status === "Installed" || w.status === "Completed").length;

  const hasOverdue = phases.some(
    (p) => p.status !== "Completed" && new Date(p.end_date) < new Date()
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">BuildTrack</h1>
        <p className="text-sm text-muted-foreground">Farmhouse — Hyderabad</p>
      </div>

      {/* Alert banner */}
      {hasOverdue && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">One or more phases are overdue</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-emerald-600" />}
          label="Remaining"
          value={formatINR(remaining)}
          sub={`of ${formatINR(totalBudget)}`}
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
          icon={<SquareStack className="h-4 w-4 text-violet-600" />}
          label="Windows"
          value={`${windowsInstalled}/9`}
          sub="Installed"
          color="violet"
        />
        <StatCard
          icon={<IndianRupee className="h-4 w-4 text-orange-600" />}
          label="Spent"
          value={formatINR(spent)}
          sub={spent === 0 ? "No actuals yet" : "Total to date"}
          color="orange"
        />
      </div>

      {/* Phase progress */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
        <h2 className="font-semibold text-sm text-gray-900">Phase Progress</h2>
        {phases.map((phase) => (
          <PhaseRow key={phase.id} phase={phase} />
        ))}
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

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function PhaseRow({ phase }: { phase: Phase }) {
  const progressMap: Record<string, number> = {
    "Not Started": 0,
    "In Progress": 50,
    Completed: 100,
    Delayed: 30,
  };
  const progress = progressMap[phase.status] ?? 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 truncate pr-2">{phase.name}</span>
        <StatusBadge status={phase.status} />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(phase.start_date)} — {formatDate(phase.end_date)}
      </p>
    </div>
  );
}
