"use client";

import { useState, useEffect } from "react";
import { Phase, DailyLog, Reminder } from "@/lib/types";
import { isWish, cleanWishText, formatDate, parseWishPhase } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronUp, Kanban, BookOpen, Sparkles, Star, Check, Trash2, Plus, Loader2 } from "lucide-react";
import { PhasesClient } from "@/components/tracker/PhasesTab";
import { LogsClient } from "@/components/tracker/LogsTab";

interface TrackerClientProps {
  phases: Phase[];
  logs: DailyLog[];
  initialReminders: Reminder[];
}

export function TrackerClient({ phases, logs, initialReminders }: TrackerClientProps) {
  const [phasesExpanded, setPhasesExpanded] = useState(true);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [wishesExpanded, setWishesExpanded] = useState(false);

  // Reminders state for managing the wish list drawer
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [newWish, setNewWish] = useState("");
  const [savingWish, setSavingWish] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Active and Completed Wishes lists
  const activeWishes = reminders.filter((r) => isWish(r.text) && !r.done);
  const completedWishes = reminders.filter((r) => isWish(r.text) && r.done);

  // Sync state if initialReminders changes
  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel("tracker_wishes_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        async () => {
          const { data } = await supabase
            .from("reminders")
            .select("*")
            .order("created_at", { ascending: false });
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

  async function handleAddWish(e: React.FormEvent) {
    e.preventDefault();
    if (!newWish.trim()) return;

    setSavingWish(true);
    const { data: project } = await supabase.from("projects").select("id").single();
    
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        project_id: project?.id,
        text: `[Wish] ${newWish.trim()}`,
        done: false,
        due_date: null,
      })
      .select()
      .single();

    if (!error && data) {
      setReminders((prev) => [data as Reminder, ...prev]);
      setNewWish("");
    } else {
      console.error("Error saving wish:", error);
    }
    setSavingWish(false);
  }

  async function handleToggleDone(id: string, currentDone: boolean) {
    // Optimistic UI update
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !currentDone } : r))
    );

    const { error } = await supabase
      .from("reminders")
      .update({ done: !currentDone })
      .eq("id", id);

    if (error) {
      console.error("Error toggling wish status:", error);
    }
  }

  async function handleDeleteWish(id: string) {
    // Optimistic UI update
    setReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting wish item:", error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Drawer 1: Construction Phases & Milestones */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setPhasesExpanded(!phasesExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Kanban className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Phases & Schedule Progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track schedule milestones, deliverables, and variance
              </p>
            </div>
          </div>
          {phasesExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {phasesExpanded && (
          <div className="border-t border-border bg-gray-50/10 p-2">
            <PhasesClient initialPhases={phases} />
          </div>
        )}
      </div>

      {/* Drawer 2: Daily Progress Logs */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setLogsExpanded(!logsExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Daily Progress Logbook</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {logs.length} journal logs, weather condition, and progress photos
              </p>
            </div>
          </div>
          {logsExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {logsExpanded && (
          <div className="border-t border-border bg-gray-50/10 p-2">
            <LogsClient initialLogs={logs} phases={phases} />
          </div>
        )}
      </div>

      {/* Drawer 3: Wish List & Pending Scope [NEW] */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setWishesExpanded(!wishesExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Wish List & Pending Tasks</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeWishes.length} dream features, backlog details, or design ideas
              </p>
            </div>
          </div>
          {wishesExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {wishesExpanded && (
          <div className="border-t border-border bg-gray-50/10 p-4 space-y-4">
            
            {/* Form to add wish list items inside tracker drawer */}
            <form onSubmit={handleAddWish} className="flex gap-2">
              <input
                type="text"
                value={newWish}
                disabled={savingWish}
                onChange={(e) => setNewWish(e.target.value)}
                className="flex-1 h-12 border border-border rounded-xl px-4 text-sm bg-white focus:outline-none focus:border-gray-400"
                placeholder="Type a new wish or pending work item..."
              />
              <button
                type="submit"
                disabled={savingWish || !newWish.trim()}
                className="h-12 px-4 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {savingWish ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="hidden sm:inline">Add Wish</span>
              </button>
            </form>

            {/* List of active wishes */}
            {activeWishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-1">
                <Sparkles className="h-10 w-10 text-amber-400 animate-bounce mb-1" />
                <p className="text-sm font-semibold text-gray-900">No active wishlist items ✨</p>
                <p className="text-xs text-muted-foreground">Type above to record pending scope or design ideas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeWishes.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-amber-100 bg-amber-50/10 hover:bg-amber-50/20 transition-all gap-3 group">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleDone(w.id, w.done)}
                        className="h-6 w-6 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 flex items-center justify-center shadow-sm text-amber-600 transition-all shrink-0 mt-0.5"
                      >
                        <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 break-words whitespace-normal">{cleanWishText(w.text)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Added on {formatDate(w.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteWish(w.id)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Delete wish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Completed wishes toggle */}
            {completedWishes.length > 0 && (
              <div className="pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 hover:text-gray-950 transition-colors py-1 focus:outline-none"
                >
                  <span>{showCompleted ? "Hide Completed Wishes" : "Show Completed Wishes"}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    {completedWishes.length} completed
                  </span>
                </button>

                {showCompleted && (
                  <div className="mt-3 space-y-2">
                    {completedWishes.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 gap-3 group opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleDone(w.id, w.done)}
                            className="h-6 w-6 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-500 line-through break-words whitespace-normal">{cleanWishText(w.text)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteWish(w.id)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
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

    </div>
  );
}
