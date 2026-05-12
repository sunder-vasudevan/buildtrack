"use client";

import { useState, useMemo, useEffect } from "react";
import { Reminder } from "@/lib/types";
import { formatDate, isWish, cleanWishText } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Bell, AlertCircle, Clock, Calendar, Check, ChevronDown, Loader2, Star, Sparkles, Plus } from "lucide-react";

export function ReminderWidget({ initialReminders }: { initialReminders: Reminder[] }) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [isExpanded, setIsExpanded] = useState(false);

  const [completedReminders, setCompletedReminders] = useState<Reminder[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);

  // State for inline quick-add
  const [newText, setNewText] = useState("");
  const [addingInline, setAddingInline] = useState(false);

  const getLocalTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalTodayStr();

  // Filter lists
  const activeReminders = reminders.filter((r) => !isWish(r.text));

  // Group standard reminders
  const groups = useMemo(() => {
    const overdue: Reminder[] = [];
    const today: Reminder[] = [];
    const upcoming: Reminder[] = [];

    activeReminders.forEach((r) => {
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
  }, [activeReminders, todayStr]);

  async function fetchCompletedReminders() {
    setIsLoadingCompleted(true);
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("done", true)
      .order("due_date", { ascending: false })
      .limit(15);
    if (data) {
      setCompletedReminders((data as Reminder[]).filter((r) => !isWish(r.text)));
    }
    setIsLoadingCompleted(false);
  }

  async function handleMarkDone(id: string) {
    const item = reminders.find((r) => r.id === id);
    if (item) {
      setCompletedReminders((prev) => [
        { ...item, done: true },
        ...prev.slice(0, 14),
      ]);
    }

    setReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .update({ done: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking reminder as done:", error);
    }
  }

  async function handleReopenReminder(id: string) {
    const item = completedReminders.find((r) => r.id === id);
    if (item) {
      setReminders((prev) => [...prev, { ...item, done: false }]);
    }

    setCompletedReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .update({ done: false })
      .eq("id", id);

    if (error) {
      console.error("Error reopening reminder:", error);
    }
  }

  async function handleAddInline(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;

    setAddingInline(true);
    const { data: project } = await supabase.from("projects").select("id").single();

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        project_id: project?.id,
        text: newText.trim(),
        done: false,
        due_date: null,
      })
      .select()
      .single();

    if (!error && data) {
      setReminders((prev) => [...prev, data as Reminder]);
      setNewText("");
    } else {
      console.error("Error adding reminder:", error);
    }
    setAddingInline(false);
  }

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard_reminders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        async () => {
          const { data: incomplete } = await supabase
            .from("reminders")
            .select("*")
            .eq("done", false)
            .order("due_date", { ascending: true });
          if (incomplete) {
            setReminders(incomplete as Reminder[]);
          }

          if (showCompleted) {
            const { data: done } = await supabase
              .from("reminders")
              .select("*")
              .eq("done", true)
              .order("due_date", { ascending: false })
              .limit(15);
            if (done) {
              setCompletedReminders((done as Reminder[]).filter((r) => !isWish(r.text)));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showCompleted]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-500 shrink-0" />
          <h2 className="font-semibold text-sm text-gray-900 text-left">📅 Site Reminders & To-Dos</h2>
          {activeReminders.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {activeReminders.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/60 space-y-4 bg-gray-50/10">
          <div className="pt-4">
            <form onSubmit={handleAddInline} className="flex gap-2">
              <input
                type="text"
                value={newText}
                disabled={addingInline}
                onChange={(e) => setNewText(e.target.value)}
                className="flex-1 h-10 border border-border rounded-lg px-3 text-xs bg-white focus:outline-none focus:border-gray-400"
                placeholder="Type a fast site reminder..."
              />
              <button
                type="submit"
                disabled={addingInline || !newText.trim()}
                className="h-10 px-3 bg-gray-950 hover:bg-gray-900 text-white rounded-lg flex items-center justify-center disabled:opacity-40"
              >
                {addingInline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </form>
          </div>

          {activeReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
              <p className="text-xs font-medium text-gray-950">No active site reminders! 🎉</p>
              <p className="text-[10px] text-muted-foreground">Type above or use + Quick Add to schedule one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overdue */}
              {groups.overdue.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-red-600 tracking-wider uppercase">Overdue</p>
                  {groups.overdue.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50 gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertCircle className="h-4.5 w-4.5 text-red-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-red-950 break-words whitespace-normal">{r.text}</p>
                          <p className="text-[9px] font-semibold text-red-600 mt-0.5 font-sans">Due: {formatDate(r.due_date!)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkDone(r.id)}
                        className="h-7 w-7 rounded-full bg-white border border-red-200 text-red-600 flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors active:scale-95 shrink-0"
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
                  <p className="text-[9px] font-bold text-amber-600 tracking-wider uppercase">Today</p>
                  {groups.today.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/30 gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Clock className="h-4.5 w-4.5 text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-950 break-words whitespace-normal">{r.text}</p>
                          <p className="text-[9px] font-semibold text-amber-600 mt-0.5">Today</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkDone(r.id)}
                        className="h-7 w-7 rounded-full bg-white border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm hover:bg-amber-50 transition-colors active:scale-95 shrink-0"
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
                  <p className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Upcoming & Standard</p>
                  {groups.upcoming.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-gray-50/50 gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Calendar className="h-4.5 w-4.5 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 break-words whitespace-normal">{r.text}</p>
                          {r.due_date && (
                            <p className="text-[9px] text-muted-foreground mt-0.5 font-sans">{formatDate(r.due_date)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkDone(r.id)}
                        className="h-7 w-7 rounded-full bg-white border border-border text-gray-600 flex items-center justify-center shadow-sm hover:bg-gray-100 transition-colors active:scale-95 shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completed Reminders Toggle Section */}
          <div className="pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={() => {
                const nextState = !showCompleted;
                setShowCompleted(nextState);
                if (nextState) {
                  fetchCompletedReminders();
                }
              }}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-950 transition-colors py-1 focus:outline-none"
            >
              <span>{showCompleted ? "Hide Completed To-Dos" : "Show Completed To-Dos"}</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-sans">
                Completed
              </span>
            </button>

            {showCompleted && (
              <div className="mt-3 space-y-2">
                {isLoadingCompleted ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> Loading...
                  </div>
                ) : completedReminders.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">No completed items yet.</p>
                ) : (
                  completedReminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 gap-3 group opacity-75 hover:opacity-100 transition-opacity">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 line-through break-words whitespace-normal leading-normal">
                            {r.text}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReopenReminder(r.id)}
                        className="text-[10px] font-bold text-primary hover:underline px-2.5 py-1 bg-white border border-border rounded-md shadow-sm active:scale-95 transition-all shrink-0"
                      >
                        Re-open
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PendingTasksWidget({ initialReminders }: { initialReminders: Reminder[] }) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [isExpanded, setIsExpanded] = useState(false);

  const [completedReminders, setCompletedReminders] = useState<Reminder[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);

  // State for inline quick-add
  const [newText, setNewText] = useState("");
  const [addingInline, setAddingInline] = useState(false);

  const activeWishes = reminders.filter((r) => isWish(r.text));

  async function fetchCompletedReminders() {
    setIsLoadingCompleted(true);
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("done", true)
      .order("due_date", { ascending: false })
      .limit(15);
    if (data) {
      setCompletedReminders((data as Reminder[]).filter((r) => isWish(r.text)));
    }
    setIsLoadingCompleted(false);
  }

  async function handleMarkDone(id: string) {
    const item = reminders.find((r) => r.id === id);
    if (item) {
      setCompletedReminders((prev) => [
        { ...item, done: true },
        ...prev.slice(0, 14),
      ]);
    }

    setReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .update({ done: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking wish as done:", error);
    }
  }

  async function handleReopenReminder(id: string) {
    const item = completedReminders.find((r) => r.id === id);
    if (item) {
      setReminders((prev) => [...prev, { ...item, done: false }]);
    }

    setCompletedReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .update({ done: false })
      .eq("id", id);

    if (error) {
      console.error("Error reopening wish:", error);
    }
  }

  async function handleAddInline(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;

    setAddingInline(true);
    const { data: project } = await supabase.from("projects").select("id").single();

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        project_id: project?.id,
        text: `[Wish] ${newText.trim()}`,
        done: false,
        due_date: null,
      })
      .select()
      .single();

    if (!error && data) {
      setReminders((prev) => [...prev, data as Reminder]);
      setNewText("");
    } else {
      console.error("Error adding wish:", error);
    }
    setAddingInline(false);
  }

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard_wishes_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        async () => {
          const { data: incomplete } = await supabase
            .from("reminders")
            .select("*")
            .eq("done", false)
            .order("due_date", { ascending: true });
          if (incomplete) {
            setReminders(incomplete as Reminder[]);
          }

          if (showCompleted) {
            const { data: done } = await supabase
              .from("reminders")
              .select("*")
              .eq("done", true)
              .order("due_date", { ascending: false })
              .limit(15);
            if (done) {
              setCompletedReminders((done as Reminder[]).filter((r) => isWish(r.text)));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showCompleted]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
          <h2 className="font-semibold text-sm text-gray-900 text-left">✨ Wish List & Pending Tasks</h2>
          {activeWishes.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {activeWishes.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/60 space-y-4 bg-gray-50/10">
          <div className="pt-4">
            <form onSubmit={handleAddInline} className="flex gap-2">
              <input
                type="text"
                value={newText}
                disabled={addingInline}
                onChange={(e) => setNewText(e.target.value)}
                className="flex-1 h-10 border border-border rounded-lg px-3 text-xs bg-white focus:outline-none focus:border-gray-400"
                placeholder="Type a wishlist / pending work..."
              />
              <button
                type="submit"
                disabled={addingInline || !newText.trim()}
                className="h-10 px-3 bg-gray-950 hover:bg-gray-900 text-white rounded-lg flex items-center justify-center disabled:opacity-40"
              >
                {addingInline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </form>
          </div>

          {activeWishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
              <p className="text-xs font-medium text-gray-950">Your Wish List is empty ✨</p>
              <p className="text-[10px] text-muted-foreground">Type a dream feature / backlog item above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeWishes.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/20 gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Star className="h-4.5 w-4.5 text-amber-500 mt-0.5 shrink-0 fill-amber-300" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 break-words whitespace-normal">{cleanWishText(w.text)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkDone(w.id)}
                    className="h-7 w-7 rounded-full bg-white border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm hover:bg-amber-50 transition-colors active:scale-95 shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Completed Wishes Toggle Section */}
          <div className="pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={() => {
                const nextState = !showCompleted;
                setShowCompleted(nextState);
                if (nextState) {
                  fetchCompletedReminders();
                }
              }}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-950 transition-colors py-1 focus:outline-none"
            >
              <span>{showCompleted ? "Hide Completed Wishes" : "Show Completed Wishes"}</span>
              <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-sans">
                Completed
              </span>
            </button>

            {showCompleted && (
              <div className="mt-3 space-y-2">
                {isLoadingCompleted ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> Loading...
                  </div>
                ) : completedReminders.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">No completed wishes yet.</p>
                ) : (
                  completedReminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 gap-3 group opacity-75 hover:opacity-100 transition-opacity">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 line-through break-words whitespace-normal leading-normal">
                            {cleanWishText(r.text)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReopenReminder(r.id)}
                        className="text-[10px] font-bold text-primary hover:underline px-2.5 py-1 bg-white border border-border rounded-md shadow-sm active:scale-95 transition-all shrink-0"
                      >
                        Re-open
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
