"use client";

import { useState, useMemo, useEffect } from "react";
import { Reminder } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Bell, AlertCircle, Clock, Calendar, Check, ChevronDown } from "lucide-react";

export function ReminderWidget({ initialReminders }: { initialReminders: Reminder[] }) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [isExpanded, setIsExpanded] = useState(false);

  const getLocalTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalTodayStr();

  // Group reminders
  const groups = useMemo(() => {
    const overdue: Reminder[] = [];
    const today: Reminder[] = [];
    const upcoming: Reminder[] = [];

    reminders.forEach((r) => {
      if (!r.due_date) {
        upcoming.push(r);
        return;
      }
      if (r.due_date < todayStr) {
        overdue.push(r);
      } else if (r.due_date === todayStr) {
        today.push(r);
      } else {
        upcoming.push(r);
      }
    });

    return { overdue, today, upcoming };
  }, [reminders, todayStr]);

  async function handleMarkDone(id: string) {
    // Optimistic update
    setReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .update({ done: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking reminder as done:", error);
    }
  }

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard_reminders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        async () => {
          // Fetch updated incomplete reminders
          const { data } = await supabase
            .from("reminders")
            .select("*")
            .eq("done", false)
            .order("due_date", { ascending: true });
          if (data) {
            setReminders(data as Reminder[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalCount = reminders.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-500 shrink-0" />
          <h2 className="font-semibold text-sm text-gray-900 text-left">Reminders & Follow-ups</h2>
          {totalCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 animate-pulse">
              {totalCount}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/60 space-y-4 bg-gray-50/10">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
              <p className="text-sm font-medium text-gray-950">All caught up! 🎉</p>
              <p className="text-xs text-muted-foreground">No pending reminders or tasks.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {/* Overdue */}
              {groups.overdue.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-red-600 tracking-wider uppercase">Overdue</p>
                  {groups.overdue.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50 gap-3 group">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertCircle className="h-4.5 w-4.5 text-red-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-red-950 break-words whitespace-normal">{r.text}</p>
                          <p className="text-xs font-medium text-red-600 mt-0.5 font-sans">Due: {formatDate(r.due_date!)}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkDone(r.id); }}
                        className="h-7 w-7 rounded-full bg-white border border-red-200 text-red-600 flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors active:scale-95 shrink-0"
                        title="Mark Done"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Today */}
              {groups.today.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Today</p>
                  {groups.today.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/30 gap-3 group">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Clock className="h-4.5 w-4.5 text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-amber-950 break-words whitespace-normal">{r.text}</p>
                          <p className="text-xs font-medium text-amber-600 mt-0.5">Today</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkDone(r.id); }}
                        className="h-7 w-7 rounded-full bg-white border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm hover:bg-amber-50 transition-colors active:scale-95 shrink-0"
                        title="Mark Done"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming */}
              {groups.upcoming.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Upcoming</p>
                  {groups.upcoming.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-gray-50/50 gap-3 group">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Calendar className="h-4.5 w-4.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 break-words whitespace-normal">{r.text}</p>
                          {r.due_date && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-sans">{formatDate(r.due_date)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkDone(r.id); }}
                        className="h-7 w-7 rounded-full bg-white border border-border text-gray-600 flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors active:scale-95 shrink-0"
                        title="Mark Done"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
