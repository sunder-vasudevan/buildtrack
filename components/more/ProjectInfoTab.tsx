"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetItem, DailyLog, Income, Phase, Project, Window, PlanDocument, Reminder } from "@/lib/types";
import { formatINR, formatDate, daysLeft } from "@/lib/utils";
import { Building2, Download, Loader2, Settings, ChevronDown, ChevronUp, Grid, FileText, PenSquare, Trash2, Search, Plus, BookOpen } from "lucide-react";
import { WindowsClient } from "@/components/tracker/WindowsTab";
import { PlansTab } from "@/components/tracker/PlansTab";

type ExportKey = "expenses" | "funds" | "status" | "logs";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ];
  triggerDownload(filename, lines.join("\n"), "text/csv;charset=utf-8");
}

function exportExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const tableHead = `<tr>${headers.map((h) => `<th>${String(h)}</th>`).join("")}</tr>`;
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((key) => `<td>${String(row[key] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${tableHead}${tableRows}</table></body></html>`;
  triggerDownload(filename, html, "application/vnd.ms-excel;charset=utf-8");
}

export function ProjectInfoTab({
  project,
  initialWindows,
  initialPlans,
  initialReminders = [],
}: {
  project: Project | null;
  initialWindows?: Window[];
  initialPlans?: PlanDocument[];
  initialReminders?: Reminder[];
}) {
  const [loading, setLoading] = useState(false);
  const [windowsExpanded, setWindowsExpanded] = useState(false);
  const [plansExpanded, setPlansExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true); // default open for gorgeous workspace visibility!
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Notes state (stored inside reminders table with [Note] prefix)
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync initial reminders
  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel("project_info_notes_sync")
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

  async function fetchAndExport(dataset: ExportKey, format: "csv" | "excel") {
    if (!project) return;
    setLoading(true);

    try {
      let rows: Record<string, unknown>[] = [];

      if (dataset === "expenses") {
        const { data, error } = await supabase
          .from("budget_items")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          rows = (data as BudgetItem[]).map((item) => ({
            category: item.category,
            item: item.item_name,
            quoted_cost: item.quoted_cost ?? "",
            actual_cost: item.actual_cost ?? "",
            status: item.status ?? "",
            payment_date: item.payment_date ?? "",
            notes: item.notes ?? "",
            created_at: item.created_at,
          }));
        }
      } else if (dataset === "funds") {
        const { data, error } = await supabase
          .from("income")
          .select("*")
          .eq("project_id", project.id)
          .order("date_received", { ascending: false });
        if (!error && data) {
          rows = (data as Income[]).map((item) => ({
            source: item.source,
            amount: item.amount,
            date_received: item.date_received,
            notes: item.notes ?? "",
            created_at: item.created_at,
          }));
        }
      } else if (dataset === "logs") {
        const { data, error } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("project_id", project.id)
          .order("log_date", { ascending: false });
        if (!error && data) {
          rows = (data as DailyLog[]).map((log) => ({
            log_date: log.log_date,
            phase_id: log.phase_id ?? "",
            deliverable: log.deliverable_name ?? "",
            status: log.work_status ?? "",
            weather: log.weather ?? "",
            description: log.description ?? "",
            issues: log.issues ?? "",
            resolution: log.resolution ?? "",
            photos_count: log.photos?.length ?? 0,
            created_at: log.created_at,
          }));
        }
      } else if (dataset === "status") {
        const [phaseRes, windowRes] = await Promise.all([
          supabase.from("phases").select("*").eq("project_id", project.id).order("phase_number", { ascending: true }),
          supabase.from("windows").select("*").eq("project_id", project.id).order("window_id", { ascending: true }),
        ]);

        const phases = (phaseRes.data ?? []) as Phase[];
        const windows = (windowRes.data ?? []) as Window[];

        rows = [
          ...phases.map((phase) => ({
            type: "phase",
            name: phase.name,
            status: phase.status,
            start_date: phase.start_date,
            end_date: phase.end_date,
            actual_start_date: phase.actual_start_date ?? "",
            actual_end_date: phase.actual_end_date ?? "",
            notes: phase.notes ?? "",
          })),
          ...windows.map((windowItem) => ({
            type: "window",
            name: `${windowItem.room} - ${windowItem.wall} (#${windowItem.window_id})`,
            status: windowItem.status,
            start_date: windowItem.ordered_date ?? "",
            end_date: windowItem.installed_date ?? "",
            actual_start_date: windowItem.delivery_date ?? "",
            actual_end_date: windowItem.installed_date ?? "",
            notes: windowItem.notes ?? "",
          })),
        ];
      }

      if (!rows.length) {
        alert(`No records found for ${dataset} to export.`);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const base = `${project.name.toLowerCase().replace(/\s+/g, "-")}-${dataset}-${today}`;

      if (format === "csv") {
        exportCSV(`${base}.csv`, rows);
      } else {
        exportExcel(`${base}.xls`, rows);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAndExportAll(format: "csv" | "excel") {
    if (!project) return;
    setLoading(true);
    const keys: ExportKey[] = ["expenses", "funds", "status", "logs"];
    try {
      for (const key of keys) {
        await fetchAndExport(key, format);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle adding notes
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setSavingNote(true);
    const { data: proj } = await supabase.from("projects").select("id").single();
    
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        project_id: proj?.id,
        text: `[Note] ${newNoteText.trim()}`,
        done: false,
        due_date: null,
      })
      .select()
      .single();

    if (!error && data) {
      setReminders((prev) => [data as Reminder, ...prev]);
      setNewNoteText("");
    } else {
      console.error("Error saving note:", error);
    }
    setSavingNote(false);
  }

  // Handle deleting notes
  async function handleDeleteNote(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("reminders").delete().eq("id", id);
  }

  // Clean note parser
  const parseNote = (text: string) => {
    return text.replace(/^\[Note\]\s*/i, "").trim();
  };

  // Extract all notes
  const notes = reminders.filter((r) => r.text.startsWith("[Note]"));

  // Apply search filtering
  const filteredNotes = notes.filter((n) =>
    parseNote(n.text).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!project) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Section 1: Project details card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
        <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
          <Building2 className="h-4.5 w-4.5 text-gray-500" /> Project Details
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Name</p><p className="font-semibold text-gray-950">{project.name}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Location</p><p className="font-semibold text-gray-950">{project.location ?? "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Plot Size</p><p className="font-semibold text-gray-950 font-sans">{project.plot_size ?? "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Building Area</p><p className="font-semibold text-gray-950 font-sans">{project.building_area ?? "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Budget</p><p className="font-semibold text-gray-950 font-sans">{formatINR(project.total_budget)}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Days Left</p><p className="font-semibold text-gray-950 font-sans">{daysLeft(project.end_date)}d</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Start</p><p className="font-semibold text-gray-950 font-sans">{formatDate(project.start_date)}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">End</p><p className="font-semibold text-gray-950 font-sans">{formatDate(project.end_date)}</p></div>
        </div>
      </div>

      {/* NEW SECTION: Running Notes & Jottings Legal Pad */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setNotesExpanded(!notesExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <PenSquare className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Project Jottings & Notepad</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notes.length} brainstorm logs, design notes, and site specifications
              </p>
            </div>
          </div>
          {notesExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {notesExpanded && (
          <div className="border-t border-border bg-gray-50/15 p-4 space-y-4">
            {/* Note writing input */}
            <form onSubmit={handleAddNote} className="flex gap-2">
              <textarea
                value={newNoteText}
                disabled={savingNote}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="flex-1 h-12 border border-border rounded-xl px-3.5 py-3 text-xs bg-white focus:outline-none focus:border-gray-400 resize-none"
                placeholder="Type running project notes, meeting details, or materials to buy..."
              />
              <button
                type="submit"
                disabled={savingNote || !newNoteText.trim()}
                className="h-12 w-12 bg-gray-950 hover:bg-gray-800 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
              >
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
              </button>
            </form>

            {/* Note search query filter */}
            {notes.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 border border-border/80 rounded-lg pl-9 pr-3 text-xs focus:outline-none bg-white focus:border-gray-400"
                  placeholder="Filter and search notepad entries..."
                />
              </div>
            )}

            {/* List notes timeline */}
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-white rounded-xl border border-dashed border-border/60">
                <BookOpen className="h-8 w-8 text-gray-300 mb-1" />
                <p className="text-xs font-semibold text-gray-900">
                  {searchQuery ? "No matching notes found" : "Your project notepad is empty"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {searchQuery ? "Try searching for a different keyword." : "Write your first brainstorm jotting above."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 bg-yellow-50/50 hover:bg-yellow-50 border border-yellow-100/60 rounded-xl flex items-start justify-between gap-3 shadow-xs transition-colors group"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-sans">
                        {parseNote(note.text)}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-sans font-medium">
                        Jotted on {formatDate(note.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Windows Accordion Block */}
      {initialWindows && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setWindowsExpanded(!windowsExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Grid className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Windows Ordering & Delivery</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track delivery & installation for {initialWindows.length} frames
                </p>
              </div>
            </div>
            {windowsExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {windowsExpanded && (
            <div className="border-t border-border bg-gray-50/10 p-2">
              <WindowsClient initialWindows={initialWindows} />
            </div>
          )}
        </div>
      )}

      {/* Section 2.5: Plans & Drawings Accordion Block */}
      {initialPlans && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setPlansExpanded(!plansExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Blueprint Plans & Drawings</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage engineering designs and PDF documents
                </p>
              </div>
            </div>
            {plansExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {plansExpanded && (
            <div className="border-t border-border bg-gray-50/10 p-2">
              <PlansTab initialPlans={initialPlans} />
            </div>
          )}
        </div>
      )}

      {/* Section 3: Settings & Export Accordion Block */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Settings & Export</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download project database tables as CSV or Excel
              </p>
            </div>
          </div>
          {settingsExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {settingsExpanded && (
          <div className="border-t border-border bg-gray-50/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAndExportAll("csv")}
                disabled={loading}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-white border border-border hover:bg-gray-50 disabled:opacity-50"
              >
                Export All CSV
              </button>
              <button
                onClick={() => fetchAndExportAll("excel")}
                disabled={loading}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
              >
                <Download className="h-3 w-3" /> Export All Excel
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold bg-blue-50/50 p-3 rounded-lg border border-blue-100 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Fetching & compiling database export... please wait.
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {([
                  { key: "expenses", label: "Expenses" },
                  { key: "funds", label: "Funds" },
                  { key: "status", label: "Status" },
                  { key: "logs", label: "Logs" },
                ] as { key: ExportKey; label: string }[]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-border">
                    <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => fetchAndExport(item.key, "csv")}
                        className="h-8 px-2.5 rounded-md text-xs font-medium bg-white border border-border hover:bg-gray-50"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => fetchAndExport(item.key, "excel")}
                        className="h-8 px-2.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Excel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
