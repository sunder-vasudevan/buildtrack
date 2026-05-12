"use client";

import { useState } from "react";
import { formatINR, daysLeft, formatDate, parseLogDescription } from "@/lib/utils";
import { BudgetItem, DailyLog, Project, Income, Phase, Reminder } from "@/lib/types";
import { CalendarDays, IndianRupee, X, TrendingUp, Landmark, ShieldAlert, BadgeCheck, FileText } from "lucide-react";
import { ReminderWidget } from "@/components/dashboard/ReminderWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { UpcomingDeliverablesWidget } from "@/components/dashboard/UpcomingDeliverablesWidget";

interface DashboardClientProps {
  initialData: {
    project: Project | null;
    budgetItems: BudgetItem[];
    recentLogs: DailyLog[];
    incomes: Income[];
    phases: Phase[];
    reminders: Reminder[];
  };
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { project, budgetItems, recentLogs, incomes, phases, reminders } = initialData;
  const [activeModal, setActiveModal] = useState<"budget" | "funds" | "spent" | "variance" | null>(null);

  const totalBudget = project?.total_budget ?? 21_74_500;
  const spent = budgetItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
  const totalIncome = incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const remaining = totalBudget - spent;
  const days = project ? daysLeft(project.end_date) : 0;

  // Group budget items by category
  const categoriesBreakdown = (() => {
    const breakdown: Record<string, { estimate: number; spent: number; itemsCount: number; paidCount: number }> = {};
    
    budgetItems.forEach((item) => {
      let cat = item.category || "Misc/Unplanned";
      if (cat === "Vendor Quotes" || cat === "Additional Items") {
        cat = "Vendor Quotes & Additional Items";
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
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Vasudha</h1>
        <p className="text-sm text-muted-foreground">Farmhouse — Hyderabad</p>
      </div>

      {/* Net Cash In Hand Banner (Health Indicator) */}
      <div
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
      </div>

      {/* Interactive 4-Grid Metrics */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Upcoming Deliverables Widget */}
      <UpcomingDeliverablesWidget phases={phases} />

      {/* Reminders widget */}
      <ReminderWidget initialReminders={reminders} />

      {/* Recent logs */}
      <RecentActivityWidget recentLogs={recentLogs} />

      {/* Footer */}
      <div className="pt-8 pb-16 text-center shrink-0">
        <p className="text-xs text-muted-foreground">v1.2.0 · Built in Hyderabad with ❤️</p>
      </div>

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
                  <p className="text-xs text-muted-foreground font-sans">Total: {formatINR(totalBudget)}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
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
              
              {incomes.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-8">No deposits recorded yet. 💸</p>
              ) : (
                <div className="space-y-2.5">
                  {incomes.map((inc) => (
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
                  <h2 className="font-bold text-gray-900 text-sm">Actual Expenditure Breakdown</h2>
                  <p className="text-xs text-muted-foreground font-sans">Total Paid: {formatINR(spent)}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4">
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
  );
}
