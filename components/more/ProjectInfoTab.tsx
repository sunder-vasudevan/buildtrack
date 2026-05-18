"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetItem, DailyLog, Income, Phase, Project, Window, PlanDocument, Reminder } from "@/lib/types";
import { formatINR, formatDate, daysLeft } from "@/lib/utils";
import { Building2, Download, Loader2, Settings, ChevronDown, ChevronUp, Grid, FileText, PenSquare, Trash2, Search, Plus, BookOpen, SlidersHorizontal, Pencil, X, Check } from "lucide-react";
import { ProjectPreferences, DEFAULT_QUICK_ADD_ORDER } from "@/lib/types";
import { usePrefs } from "@/lib/prefs-context";
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
  project: initialProject,
  initialWindows,
  initialPlans,
  initialReminders = [],
}: {
  project: Project | null;
  initialWindows?: Window[];
  initialPlans?: PlanDocument[];
  initialReminders?: Reminder[];
}) {
  const [project, setProject] = useState<Project | null>(initialProject);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    name: "",
    location: "",
    plot_size: "",
    building_area: "",
    total_budget: "",
    start_date: "",
    end_date: "",
  });
  const [savingProject, setSavingProject] = useState(false);

  function startEdit() {
    if (!project) return;
    setEditFields({
      name: project.name,
      location: project.location ?? "",
      plot_size: project.plot_size ?? "",
      building_area: project.building_area ?? "",
      total_budget: String(project.total_budget),
      start_date: project.start_date,
      end_date: project.end_date,
    });
    setEditMode(true);
  }

  async function saveEdit() {
    if (!project) return;
    setSavingProject(true);
    const payload = {
      name: editFields.name,
      location: editFields.location || null,
      plot_size: editFields.plot_size || null,
      building_area: editFields.building_area || null,
      total_budget: Number(editFields.total_budget),
      start_date: editFields.start_date,
      end_date: editFields.end_date,
    };
    const { error } = await supabase.from("projects").update(payload).eq("id", project.id);
    if (!error) {
      const updated = { ...project, ...payload };
      setProject(updated);
      if (editFields.name !== project.name) {
        setPrefs({ ...prefs });
      }
      setEditMode(false);
    }
    setSavingProject(false);
  }

  const [loading, setLoading] = useState(false);
  const [windowsExpanded, setWindowsExpanded] = useState(false);
  const [plansExpanded, setPlansExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [prefsExpanded, setPrefsExpanded] = useState(false);
  const { prefs, setPrefs } = usePrefs();
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function savePrefs(updated: ProjectPreferences) {
    setSavingPrefs(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("projects").update({ preferences: updated }).eq("user_id", user.id);
    setSavingPrefs(false);
  }

  function togglePref(section: "tabs" | "quickAdd" | "dashboardWidgets", key: string) {
    const sectionObj = prefs[section] ?? {};
    const updated = { ...prefs, [section]: { ...sectionObj, [key]: !(sectionObj as Record<string, boolean>)[key] } };
    setPrefs(updated);
    savePrefs(updated);
  }

  function moveQuickAdd(index: number, dir: -1 | 1) {
    const order = [...(prefs.quickAddOrder ?? DEFAULT_QUICK_ADD_ORDER)];
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    const updated = { ...prefs, quickAddOrder: order };
    setPrefs(updated);
    savePrefs(updated);
  }

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
          const { data: { user } } = await supabase.auth.getUser();
          const { data } = await supabase
            .from("reminders")
            .select("*")
            .eq("user_id", user!.id)
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
    const { data: { user } } = await supabase.auth.getUser();
    const { data: proj } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        project_id: proj?.id,
        user_id: user!.id,
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-gray-500" /> Project Details
          </h2>
          {!editMode ? (
            <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setEditMode(false)} disabled={savingProject} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button onClick={saveEdit} disabled={savingProject} className="flex items-center gap-1 text-xs bg-gray-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40">
                {savingProject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
              </button>
            </div>
          )}
        </div>
        {!editMode ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Name</p><input type="text" value={editFields.name} onChange={e => setEditFields(f => ({...f, name: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
            <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Location</p><input type="text" value={editFields.location} onChange={e => setEditFields(f => ({...f, location: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
            <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Plot Size (sqft)</p><input type="number" value={editFields.plot_size} onChange={e => setEditFields(f => ({...f, plot_size: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
            <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Building Area (sqft)</p><input type="number" value={editFields.building_area} onChange={e => setEditFields(f => ({...f, building_area: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
            <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Budget (₹)</p><input type="number" value={editFields.total_budget} onChange={e => setEditFields(f => ({...f, total_budget: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
            <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Start Date</p><input type="date" value={editFields.start_date} onChange={e => setEditFields(f => ({...f, start_date: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
            <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">End Date</p><input type="date" value={editFields.end_date} onChange={e => setEditFields(f => ({...f, end_date: e.target.value}))} className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400 bg-white" /></div>
          </div>
        )}
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

      {/* Display Preferences */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button onClick={() => setPrefsExpanded(!prefsExpanded)} className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Display Preferences</span>
            {savingPrefs && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>
          {prefsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {prefsExpanded && (
          <div className="border-t border-border p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tabs</p>
              <div className="space-y-2">
                {([
                  { key: "overview", label: "Overview" },
                  { key: "tracker", label: "Tracker" },
                  { key: "finances", label: "Finances" },
                  { key: "more", label: "Project Info" },
                ] as { key: keyof ProjectPreferences["tabs"]; label: string }[]).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      onClick={() => togglePref("tabs", key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${prefs.tabs[key] ? "bg-gray-900" : "bg-gray-200"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.tabs[key] ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Home Page Widgets</p>
              <div className="space-y-2">
                {([
                  { key: "phaseProgress", label: "Phase Progress" },
                  { key: "netCash", label: "Net Cash Banner" },
                  { key: "metrics", label: "Key Metrics" },
                  { key: "budgetProgress", label: "Budget Progress" },
                  { key: "upcomingDeliverables", label: "Upcoming Milestones" },
                  { key: "reminders", label: "Reminders" },
                  { key: "pendingTasks", label: "Pending Tasks" },
                  { key: "recentActivity", label: "Recent Activity" },
                ] as { key: keyof NonNullable<ProjectPreferences["dashboardWidgets"]>; label: string }[]).map(({ key, label }) => {
                  const val = prefs.dashboardWidgets?.[key] ?? true;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{label}</span>
                      <button
                        onClick={() => togglePref("dashboardWidgets", key)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${val ? "bg-gray-900" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${val ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Add Options</p>
              <div className="space-y-2">
                {(() => {
                  const LABELS: Record<string, string> = { log: "Log Work", expense: "Add Expense", funds: "Add Funds", reminder: "Reminder", wish: "Wish List", note: "Note" };
                  const order = prefs.quickAddOrder ?? DEFAULT_QUICK_ADD_ORDER;
                  return order.map((key, index) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveQuickAdd(index, -1)}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveQuickAdd(index, 1)}
                          disabled={index === order.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-700 flex-1">{LABELS[key] ?? key}</span>
                      <button
                        onClick={() => togglePref("quickAdd", key)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${prefs.quickAdd[key as keyof typeof prefs.quickAdd] ? "bg-gray-900" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.quickAdd[key as keyof typeof prefs.quickAdd] ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
