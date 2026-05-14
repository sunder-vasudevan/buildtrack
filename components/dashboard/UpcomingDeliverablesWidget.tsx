"use client";

import { useState, useMemo } from "react";
import { Phase } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarRange, ChevronDown, AlertTriangle } from "lucide-react";

export function UpcomingDeliverablesWidget({ phases }: { phases: Phase[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = today.toISOString().split("T")[0];

  // Default "to" = 30 days from today
  const defaultTo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, [today]);

  const [filterFrom, setFilterFrom] = useState(todayStr);
  const [filterTo, setFilterTo] = useState(defaultTo);

  const upcomingDeliverables = useMemo(() => {
    const list: Array<{
      phaseId: string;
      phaseName: string;
      name: string;
      planned_due: string;
      daysLeft: number;
    }> = [];

    const todayMs = today.getTime();
    const fromMs = filterFrom ? new Date(filterFrom).setHours(0, 0, 0, 0) : -Infinity;
    const toMs = filterTo ? new Date(filterTo).setHours(23, 59, 59, 999) : Infinity;

    phases.forEach((phase) => {
      if (phase.deliverables && Array.isArray(phase.deliverables)) {
        phase.deliverables.forEach((item) => {
          const del = typeof item === "string" ? { name: item, planned_start: null, planned_due: null, actual_due: null } : item;
          if (del.planned_due && !del.actual_due) {
            const dueDate = new Date(del.planned_due);
            dueDate.setHours(0, 0, 0, 0);
            const dueDateMs = dueDate.getTime();
            if (dueDateMs >= fromMs && dueDateMs <= toMs) {
              const diffDays = Math.ceil((dueDateMs - todayMs) / (1000 * 60 * 60 * 24));
              list.push({
                phaseId: phase.id,
                phaseName: phase.name,
                name: del.name,
                planned_due: del.planned_due,
                daysLeft: diffDays,
              });
            }
          }
        });
      }
    });

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [phases, today, filterFrom, filterTo]);

  const totalCount = upcomingDeliverables.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <CalendarRange className="h-5 w-5 text-gray-500 shrink-0" />
          <div>
            <h2 className="font-semibold text-sm text-gray-900 text-left">Upcoming Milestones</h2>
          </div>
          {totalCount > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              upcomingDeliverables.some(d => d.daysLeft < 0)
                ? "bg-red-100 text-red-700 animate-pulse"
                : "bg-blue-100 text-blue-700"
            }`}>
              {totalCount}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/60 space-y-3 bg-gray-50/10">
          {/* Date range filter */}
          <div className="grid grid-cols-2 gap-2 pt-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">From</p>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full h-8 border border-border rounded-lg px-2 text-xs bg-white"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">To</p>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full h-8 border border-border rounded-lg px-2 text-xs bg-white"
              />
            </div>
          </div>

          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-1 mt-3">
              <p className="text-sm font-medium text-gray-950">No upcoming milestones 🎉</p>
              <p className="text-xs text-muted-foreground">All deliverables for the next 7 days are on track.</p>
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {upcomingDeliverables.map((item, index) => {
                const isOverdue = item.daysLeft < 0;
                const isDueToday = item.daysLeft === 0;

                return (
                  <div
                    key={`${item.phaseId}_${item.name}_${index}`}
                    className={`flex items-start justify-between p-3 rounded-lg border gap-3 ${
                      isOverdue
                        ? "border-red-100 bg-red-50/40"
                        : isDueToday
                        ? "border-amber-100 bg-amber-50/30"
                        : "border-border bg-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-[9px]">
                        {item.phaseName}
                      </p>
                      <p className={`text-sm font-bold ${isOverdue ? "text-red-950" : "text-gray-900"}`}>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-sans">
                        Target Date: {formatDate(item.planned_due)}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end justify-center self-center">
                      {isOverdue ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          {Math.abs(item.daysLeft)}d overdue
                        </span>
                      ) : isDueToday ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-full">
                          Due today
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-sans">
                          in {item.daysLeft}d
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
