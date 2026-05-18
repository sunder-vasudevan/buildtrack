"use client";

import { useState, useEffect } from "react";
import { formatINR, daysLeft, formatDate, parseLogDescription } from "@/lib/utils";
import { BudgetItem, DailyLog, Project, Income, Phase, Reminder, Expense } from "@/lib/types";
import { CalendarDays, IndianRupee, X, TrendingUp, Landmark, ShieldAlert, BadgeCheck, FileText, Loader2, Edit3, Save, PencilLine, Trash2, LogOut, HelpCircle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ReminderWidget, PendingTasksWidget } from "@/components/dashboard/ReminderWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { UpcomingDeliverablesWidget } from "@/components/dashboard/UpcomingDeliverablesWidget";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";
import { usePrefs } from "@/lib/prefs-context";

interface DashboardClientProps {
  initialData: {
    project: Project | null;
    budgetItems: BudgetItem[];
    recentLogs: DailyLog[];
    incomes: Income[];
    phases: Phase[];
    reminders: Reminder[];
    expenses: Expense[];
  };
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { project, budgetItems, recentLogs, incomes, phases, reminders, expenses: initialExpenses } = initialData;
  const { prefs } = usePrefs();
  const [activeModal, setActiveModal] = useState<"budget" | "funds" | "spent" | "variance" | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const CHANGELOG = [
    { version: "v2.0.0", date: "17 May 2026", items: ["Multi-user login & accounts", "Setup wizard for new projects", "Backblaze B2 cloud storage", "Add reminders to phone calendar", "Display preferences per user"] },
    { version: "v1.0.0", date: "12 May 2026", items: ["Financial dashboard", "Net Cash Balance banner", "Reminders widget", "QuickAdd FAB"] },
    { version: "v0.1.0", date: "11 May 2026", items: ["First release — phases & deliverables", "Daily logs & budget tracking"] },
  ];

  // Stateful copies for real-time responsiveness
  const [currentProject, setCurrentProject] = useState<Project | null>(project);
  const [items, setItems] = useState<BudgetItem[]>(budgetItems);
  const [allExpenses, setAllExpenses] = useState<Expense[]>(initialExpenses ?? []);
  const [allIncomes, setAllIncomes] = useState<Income[]>(incomes);
  const [logs, setLogs] = useState<DailyLog[]>(recentLogs);
  const [allReminders, setAllReminders] = useState<Reminder[]>(reminders);

  // States for live budget editing
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetValue, setNewBudgetValue] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  // State for spent details tab and edit expense
  const [spentTab, setSpentTab] = useState<"categories" | "detailed">("categories");
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  useEffect(() => {
    if (currentProject) {
      setNewBudgetValue(String(currentProject.total_budget));
    }
  }, [currentProject]);

  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    }

    const budgetChannel = supabase
      .channel("dashboard_budget_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_items" }, async () => {
        const uid = await getUserId(); if (!uid) return;
        const { data } = await supabase.from("budget_items").select("*").eq("user_id", uid).order("category");
        if (data) setItems(data as BudgetItem[]);
      })
      .subscribe();

    const incomeChannel = supabase
      .channel("dashboard_income")
      .on("postgres_changes", { event: "*", schema: "public", table: "income" }, async () => {
        const uid = await getUserId(); if (!uid) return;
        const { data } = await supabase.from("income").select("*").eq("user_id", uid).order("date_received", { ascending: false });
        if (data) setAllIncomes(data as Income[]);
      })
      .subscribe();

    const logsChannel = supabase
      .channel("dashboard_logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_logs" }, async () => {
        const uid = await getUserId(); if (!uid) return;
        const { data } = await supabase.from("daily_logs").select("*").eq("user_id", uid).order("log_date", { ascending: false }).limit(3);
        if (data) setLogs(data as DailyLog[]);
      })
      .subscribe();

    const remindersChannel = supabase
      .channel("dashboard_reminders")
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, async () => {
        const uid = await getUserId(); if (!uid) return;
        const { data } = await supabase.from("reminders").select("*").eq("user_id", uid).eq("done", false).order("due_date", { ascending: true });
        if (data) setAllReminders(data as Reminder[]);
      })
      .subscribe();

    const projectChannel = supabase
      .channel("dashboard_projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, async () => {
        const uid = await getUserId(); if (!uid) return;
        const { data } = await supabase.from("projects").select("*").eq("user_id", uid).maybeSingle();
        if (data) setCurrentProject(data as Project);
      })
      .subscribe();

    const expensesChannel = supabase
      .channel("dashboard_expenses")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, async () => {
        const uid = await getUserId(); if (!uid) return;
        const { data } = await supabase.from("expenses").select("*").eq("user_id", uid).order("expense_date", { ascending: false });
        if (data) setAllExpenses(data as Expense[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(incomeChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(remindersChannel);
      supabase.removeChannel(projectChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, []);

  async function handleSaveBudget() {
    const val = Number(newBudgetValue);
    if (isNaN(val) || val <= 0) return;
    setSavingBudget(true);
    const { data: proj } = await supabase.from("projects").select("id").single();
    if (proj?.id) {
      await supabase.from("projects").update({ total_budget: val }).eq("id", proj.id);
      setIsEditingBudget(false);
    }
    setSavingBudget(false);
  }

  async function handleDeleteExpense(item: BudgetItem) {
    const isCustom = !item.quoted_cost;
    const confirmMessage = isCustom
      ? `Are you sure you want to permanently delete the custom expense "${item.item_name}"?`
      : `Are you sure you want to reset/delete the logged payment of ${formatINR(item.actual_cost || 0)} for "${item.item_name}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (isCustom) {
        const { error } = await supabase.from("budget_items").delete().eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budget_items")
          .update({
            actual_cost: null,
            payment_date: null,
            status: "Approved",
            notes: null,
            receipt_url: null,
          })
          .eq("id", item.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete. Please try again.");
    }
  }

  const totalBudget = currentProject?.total_budget ?? 21_74_500;
  const unlinkedExpenseTotal = allExpenses.filter((e) => !e.budget_item_id).reduce((s, e) => s + e.amount, 0);
  const spent = items.reduce((s, i) => s + (i.actual_cost ?? 0), 0) + unlinkedExpenseTotal;
  const totalIncome = allIncomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const remaining = totalBudget - spent;
  const days = currentProject ? daysLeft(currentProject.end_date) : 0;

  // Group budget items by category
  const categoriesBreakdown = (() => {
    const breakdown: Record<string, { estimate: number; spent: number; itemsCount: number; paidCount: number }> = {};
    
    items.forEach((item) => {
      let cat = item.category || "Misc/Unplanned";
      if (cat === "Vendor Quotes" || cat === "Additional Items") {
        cat = "Estimates";
      }
      if (cat === "Other" || cat === "Others") {
        cat = "Misc/Unplanned";
      }
      
      if (!breakdown[cat]) {
        breakdown[cat] = { estimate: 0, spent: 0, itemsCount: 0, paidCount: 0 };
      }
      
      breakdown[cat].estimate += item.quoted_cost || 0;
      breakdown[cat].spent += item.actual_cost || 0;
      breakdown[cat].itemsCount += 1;
      if (item.actual_cost) {
        breakdown[cat].paidCount += 1;
      }
    });
    
    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.spent - a.spent);
  })();

  // Schedule Variance logic
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

  const spentPct = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
  const varianceBadge = hasTracking
    ? scheduleVariance > 0
      ? { text: `+${scheduleVariance}d behind`, color: "red" as const }
      : scheduleVariance < 0
      ? { text: `${Math.abs(scheduleVariance)}d ahead`, color: "green" as const }
      : { text: "On schedule", color: "green" as const }
    : undefined;

  const netBalance = totalIncome - spent;

  return (
    <>
      {editingItem && (
        <ExpenseForm
          prefillItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
          }}
        />
      )}
      <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 pb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{currentProject?.name ?? "BuildTrack"}</h1>
            {phases.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {Math.round((phases.filter(p => p.status === "Completed").length / phases.length) * 100)}%
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{currentProject?.location ?? ""}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-gray-700 transition-colors" title="Help">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth/login"; }} className="text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Phase Progress Section */}
      {(prefs.dashboardWidgets?.phaseProgress ?? true) && phases.length > 0 && (() => {
        const completedPhases = phases.filter(p => p.status === "Completed").length;
        const phasePct = Math.round((completedPhases / phases.length) * 100);
        return (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700">{completedPhases} of {phases.length} phases complete</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{phasePct}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${phasePct}%` }} />
            </div>
            <div className="space-y-1 pt-1">
              {phases.filter(ph => ph.status === "Completed" || ph.status === "In Progress").map((ph) => {
                const isOpen = expandedPhase === ph.id;
                const deliverables = (ph.deliverables as any[] ?? []);
                return (
                  <div key={ph.id} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedPhase(isOpen ? null : ph.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${ph.status === "Completed" ? "bg-amber-500" : "bg-blue-400"}`} />
                      <span className={`text-[11px] font-semibold flex-1 text-left ${ph.status === "Completed" ? "line-through text-gray-400" : "text-gray-700"}`}>{ph.name}</span>
                      <span className="text-[10px] text-gray-400">{ph.status}</span>
                      {isOpen ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 py-2 space-y-2 bg-white">
                        {/* Dates */}
                        <div className="flex gap-4 text-[10px] text-gray-500">
                          {ph.start_date && <span>Start: <span className="font-semibold text-gray-700">{formatDate(ph.start_date)}</span></span>}
                          {ph.end_date && <span>End: <span className="font-semibold text-gray-700">{formatDate(ph.end_date)}</span></span>}
                        </div>
                        {/* Deliverables */}
                        {deliverables.length > 0 && (
                          <div className="space-y-1">
                            {deliverables.map((d: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${d.status === "Completed" ? "bg-emerald-500" : "bg-gray-300"}`} />
                                <span className={`text-[10px] ${d.status === "Completed" ? "line-through text-gray-400" : "text-gray-600"}`}>
                                  {typeof d === "string" ? d : d.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Link to Tracker */}
                        <Link href="/tracker" className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold hover:underline">
                          <ExternalLink className="h-3 w-3" /> Open in Tracker
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Net Cash In Hand Banner (Health Indicator) */}
      {(prefs.dashboardWidgets?.netCash ?? true) && <div
        onClick={() => setActiveModal("funds")}
        className={`cursor-pointer rounded-xl p-4 border shadow-sm space-y-2 transition-all hover:scale-[1.01] ${
          netBalance >= 0
            ? "bg-blue-50 border-blue-100 hover:bg-blue-100/50"
            : "bg-red-50 border-red-100 hover:bg-red-100/50 animate-pulse"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full ${netBalance >= 0 ? "bg-blue-500 animate-pulse" : "bg-red-500 animate-ping"}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${netBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {netBalance >= 0 ? "Net Cash In Hand" : "Net Cash Deficit"}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${netBalance >= 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>
            {netBalance >= 0 ? "🟢 Capital Healthy" : "🚨 Over-spent Alert"}
          </span>
        </div>
        <p className={`text-2xl font-extrabold font-sans ${netBalance >= 0 ? "text-blue-900" : "text-red-900"}`}>{formatINR(netBalance)}</p>
        <p className={`text-xs ${netBalance >= 0 ? "text-blue-700/80" : "text-red-700/80"}`}>
          {netBalance >= 0
            ? "Site funds received exceed total actual expenditures to date. Tap to view capital logs."
            : `Site expenditures exceed deposited capital by ${formatINR(Math.abs(netBalance))}. Tap to record/view deposits.`}
        </p>
      </div>}

      {/* Interactive 4-Grid Metrics */}
      {(prefs.dashboardWidgets?.metrics ?? true) && <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => setActiveModal("budget")}
          className="bg-white hover:bg-gray-50/50 active:scale-95 cursor-pointer rounded-xl p-3 border border-border shadow-sm space-y-1 transition-all"
        >
          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center justify-between">
            <span>Total Budget</span>
            <span className="text-[9px] bg-purple-50 text-purple-700 px-1 rounded">View</span>
          </p>
          <p className="text-base font-extrabold text-gray-900 font-sans">{formatINR(totalBudget)}</p>
        </div>
        <div
          onClick={() => setActiveModal("funds")}
          className="bg-emerald-50 hover:bg-emerald-100/50 active:scale-95 cursor-pointer rounded-xl p-3 border border-emerald-100 shadow-sm space-y-1 transition-all"
        >
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Capital Received</span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">View</span>
          </p>
          <p className="text-base font-extrabold text-emerald-800 font-sans">{formatINR(totalIncome)}</p>
        </div>
        <div
          onClick={() => setActiveModal("spent")}
          className="bg-orange-50 hover:bg-orange-100/50 active:scale-95 cursor-pointer rounded-xl p-3 border border-orange-100 shadow-sm space-y-1 transition-all"
        >
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider flex items-center justify-between">
            <span>Total Spent</span>
            <span className="text-[9px] bg-orange-100 text-orange-800 px-1 rounded">View</span>
          </p>
          <p className="text-base font-extrabold text-orange-800 font-sans">{formatINR(spent)}</p>
        </div>
        <div
          onClick={() => setActiveModal("variance")}
          className="bg-blue-50 hover:bg-blue-100/50 active:scale-95 cursor-pointer border border-blue-100 rounded-xl p-3 shadow-sm space-y-1 relative transition-all"
        >
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
            <span>Days Left</span>
            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded">View</span>
          </p>
          <p className="text-base font-extrabold text-blue-800 font-sans">{days > 0 ? `${days}d` : "Overdue"}</p>
          {varianceBadge && (
            <span className={`absolute bottom-2.5 right-2.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
              varianceBadge.color === "red" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              {varianceBadge.text}
            </span>
          )}
        </div>
      </div>}

      {/* Double Progress Bar */}
      {(prefs.dashboardWidgets?.budgetProgress ?? true) && <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-2">
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
      </div>}

      {/* Upcoming Deliverables Widget */}
      {(prefs.dashboardWidgets?.upcomingDeliverables ?? true) && <UpcomingDeliverablesWidget phases={phases} />}

      {/* Reminders widget */}
      {(prefs.dashboardWidgets?.reminders ?? true) && <ReminderWidget initialReminders={allReminders} />}

      {/* Pending Tasks & Wishlist accordion */}
      {(prefs.dashboardWidgets?.pendingTasks ?? true) && <PendingTasksWidget initialReminders={allReminders} />}

      {/* Recent logs */}
      {(prefs.dashboardWidgets?.recentActivity ?? true) && <RecentActivityWidget recentLogs={logs} phases={phases} />}

      {/* Footer */}
      <div className="pt-8 pb-16 text-center shrink-0">
        <button onClick={() => setShowChangelog(true)} className="text-xs text-muted-foreground cursor-pointer underline-offset-2 hover:text-gray-600 transition-colors">v2.0.0 · 17 May 2026 · Built in Hyderabad with ❤️</button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-gray-700" />
                <h2 className="font-bold text-gray-900">Help Guide</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-5 text-sm">
              {[
                { title: "Navigation", items: [
                  { label: "Overview", desc: "Dashboard: budget summary, net cash balance, recent logs, reminders" },
                  { label: "Tracker", desc: "Phases, daily logs, uploaded plans & specs" },
                  { label: "Finances", desc: "Budget items + funds received" },
                  { label: "Project Info", desc: "Project details, team, exports, preferences, backup" },
                ]},
                { title: "Quick Add (+ button)", items: [
                  { label: "Log Work", desc: "Daily site progress with photos, phase & deliverable" },
                  { label: "Add Expense", desc: "Record a payment against a budget item" },
                  { label: "Add Funds", desc: "Record money received (loan, contribution, etc.)" },
                  { label: "Reminder", desc: "Set a reminder with a due date" },
                  { label: "Wish List", desc: "Add backlog items or future ideas" },
                  { label: "Note", desc: "Quick freeform note" },
                ]},
                { title: "Phases & Deliverables", items: [
                  { label: "Phases", desc: "Main build stages (Foundation, Walls, Finishes…)" },
                  { label: "Deliverables", desc: "Specific tasks within each phase — turns green when complete, red if overdue" },
                ]},
                { title: "Finances", items: [
                  { label: "Budget", desc: "All items by category — quoted vs actual cost" },
                  { label: "Funds", desc: "All capital received — source, amount, date" },
                  { label: "Net Cash Balance", desc: "Total funds received − total expenses paid" },
                ]},
                { title: "Troubleshooting", items: [
                  { label: "Data not showing", desc: "Refresh the page" },
                  { label: "Photos not uploading", desc: "Check internet connection; max 10MB" },
                  { label: "Can't log in", desc: "Check your email and password" },
                ]},
              ].map(({ title, items }) => (
                <div key={title}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
                  <div className="space-y-2">
                    {items.map(({ label, desc }) => (
                      <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="font-semibold text-gray-800 text-xs">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-center text-gray-400 pb-4">v2.0.0 · buildtrackapp.vercel.app</p>
            </div>
          </div>
        </div>
      )}

      {/* ================================= DETAIL MODALS ================================= */}

      {/* 1. Total Project Budget Details Modal */}
      {activeModal === "budget" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border bg-white rounded-t-2xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-700"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Budget & Estimates</h2>
                  {isEditingBudget ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={newBudgetValue}
                        onChange={(e) => setNewBudgetValue(e.target.value)}
                        className="border border-border rounded-lg px-2 py-0.5 text-xs font-semibold w-28 text-gray-905 bg-white"
                        autoFocus
                      />
                      <button onClick={handleSaveBudget} disabled={savingBudget} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                        {savingBudget ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => setIsEditingBudget(false)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground font-sans">Total: {formatINR(totalBudget)}</p>
                      <button onClick={() => { setIsEditingBudget(true); setNewBudgetValue(String(totalBudget)); }} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-semibold">
                        <Edit3 className="h-2.5 w-2.5" /> edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => { setActiveModal(null); setIsEditingBudget(false); }} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4">
              <p className="text-xs text-muted-foreground">Category-wise comparison of estimated targets versus actual payments logged:</p>
              
              <div className="space-y-3">
                {categoriesBreakdown.map((cat) => {
                  const pct = cat.estimate > 0 ? (cat.spent / cat.estimate) * 100 : 0;
                  return (
                    <div key={cat.name} className="border border-border/60 rounded-xl p-3 bg-gray-50/30 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-xs">{cat.name}</h4>
                          <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                            {cat.itemsCount} items · {cat.paidCount} paid
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pct > 90 ? "bg-red-50 text-red-700" : pct > 50 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {pct > 0 ? `${Math.round(pct)}% used` : "0% used"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Estimate</p>
                          <p className="font-bold text-gray-900">{formatINR(cat.estimate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Actual Spent</p>
                          <p className="font-bold text-gray-800">{formatINR(cat.spent)}</p>
                        </div>
                      </div>

                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 100 ? "bg-red-500" : "bg-purple-500"}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Total Capital Funds Received Details Modal */}
      {activeModal === "funds" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border bg-white rounded-t-2xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><Landmark className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Capital Funds Log</h2>
                  <p className="text-xs text-muted-foreground font-sans">Total Deposited: {formatINR(totalIncome)}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4">
              <p className="text-xs text-muted-foreground">Deposit logs received and credited to the farmhouse construction account:</p>
              
              {allIncomes.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-8">No deposits recorded yet. 💸</p>
              ) : (
                <div className="space-y-2.5">
                  {allIncomes.map((inc) => (
                    <div key={inc.id} className="border border-border/60 rounded-xl p-3 bg-emerald-50/10 hover:bg-emerald-50/20 transition-all flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-xs">{inc.source}</p>
                        <p className="font-extrabold text-emerald-800 text-xs font-sans">{formatINR(inc.amount)}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <p>{formatDate(inc.date_received)}</p>
                        {inc.notes && <p className="italic max-w-[65%] truncate">📝 {inc.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Total Spent Details Modal */}
      {activeModal === "spent" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border bg-white rounded-t-2xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-700"><IndianRupee className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Actual Expenditure</h2>
                  <p className="text-xs text-muted-foreground font-sans">Total Paid: {formatINR(spent)}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-border/80 bg-gray-50/50 shrink-0">
              <button
                onClick={() => setSpentTab("categories")}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 text-center ${
                  spentTab === "categories" ? "border-orange-500 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setSpentTab("detailed")}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 text-center ${
                  spentTab === "detailed" ? "border-orange-500 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Detailed Logs ({items.filter(i => i.actual_cost !== null && i.actual_cost > 0).length})
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4">
              {spentTab === "categories" ? (
                <>
                  <p className="text-xs text-muted-foreground">Breakdown of actual cash expenditures logged across categories:</p>
                  <div className="space-y-3">
                    {categoriesBreakdown.map((cat) => {
                      if (cat.spent === 0) return null;
                      const sharePct = spent > 0 ? (cat.spent / spent) * 100 : 0;
                      return (
                        <div key={cat.name} className="border border-border/60 rounded-xl p-3 bg-gray-50/30 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-gray-900">{cat.name}</span>
                            <span className="text-orange-800 font-sans">{formatINR(cat.spent)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-sans">
                            <span>{cat.paidCount} active payment logs</span>
                            <span>{Math.round(sharePct)}% of total spent</span>
                          </div>

                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-orange-500"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Individual expense logs. Tap ✏️ to edit or 🗑️ to delete:</p>
                  <div className="space-y-3">
                    {(() => {
                      const loggedItems = items
                        .filter((i) => i.actual_cost !== null && i.actual_cost > 0)
                        .sort((a, b) => {
                          const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0;
                          const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0;
                          return dateB - dateA;
                        });

                      if (loggedItems.length === 0) {
                        return <p className="text-xs text-center text-muted-foreground py-8">No logged expenses found. 💸</p>;
                      }

                      return loggedItems.map((item) => (
                        <div key={item.id} className="border border-border/60 rounded-xl p-3 bg-white hover:bg-gray-50/40 transition-all flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-xs">{item.item_name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="text-[9px] font-bold bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100/50">
                                  📂 {item.category || "Other"}
                                </span>
                                {item.payment_date && (
                                  <span className="text-[9px] font-medium text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100/50">
                                    📅 {formatDate(item.payment_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingItem(item); setActiveModal(null); }}
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                                title="Edit Expense"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(item)}
                                className="p-1 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                title="Delete/Reset Expense"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-50/50 pt-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[65%]">
                              {item.notes ? `📝 ${item.notes.replace(/\[Deliverable:.*?\]/g, "").replace(/\|/g, " ").replace(/\s+/g, " ").trim()}` : "No notes"}
                            </span>
                            <span className="font-extrabold text-orange-800 text-xs font-sans">
                              {formatINR(item.actual_cost ?? 0)}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Changelog Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="font-bold text-gray-900">What&apos;s New</h2>
              <button onClick={() => setShowChangelog(false)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-5">
              {CHANGELOG.map(({ version, date, items: changes }) => (
                <div key={version}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{version}</span>
                    <span className="text-xs text-muted-foreground">{date}</span>
                  </div>
                  <ul className="space-y-1">
                    {changes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Days Left & Schedule Variance Details Modal */}
      {activeModal === "variance" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border bg-white rounded-t-2xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Schedule & Deliverables</h2>
                  <p className="text-xs text-muted-foreground font-sans">{days > 0 ? `${days} days remaining` : "Project schedule is overdue"}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4">
              <p className="text-xs text-muted-foreground">Current milestone tracking status and schedule metrics:</p>
              
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-border/40 pb-3 font-sans">
                <div>
                  <p className="text-[10px] text-muted-foreground">Target Completion Date</p>
                  <p className="font-bold text-gray-900">{project ? formatDate(project.end_date) : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Schedule Health</p>
                  <p className={`font-bold ${scheduleVariance > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {scheduleVariance > 0 ? `🚨 ${scheduleVariance} days delayed` : "✅ On track"}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold text-gray-900 text-xs">Milestone Phase Metrics</h4>
                {phases.map((ph) => {
                  let varianceDays = 0;
                  if (ph.status === "Completed" && ph.actual_end_date) {
                    varianceDays = Math.round((new Date(ph.actual_end_date).getTime() - new Date(ph.end_date).getTime()) / (1000 * 60 * 60 * 24));
                  } else if (ph.status === "In Progress" || ph.status === "Delayed") {
                    const today = new Date().getTime();
                    const expected = new Date(ph.end_date).getTime();
                    if (today > expected) {
                      varianceDays = Math.round((today - expected) / (1000 * 60 * 60 * 24));
                    }
                  }

                  return (
                    <div key={ph.id} className="border border-border/60 rounded-xl p-3 bg-gray-50/10 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{ph.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          ph.status === "Completed" ? "bg-emerald-50 text-emerald-800" : ph.status === "Delayed" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"
                        }`}>{ph.status}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-sans">
                        <div>
                          <span>Target Date: {formatDate(ph.end_date)}</span>
                        </div>
                        {varianceDays !== 0 && (
                          <div className="text-right">
                            <span className={varianceDays > 0 ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                              {varianceDays > 0 ? `+${varianceDays}d overdue` : `${Math.abs(varianceDays)}d early`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
