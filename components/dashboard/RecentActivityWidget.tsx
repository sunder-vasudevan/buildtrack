"use client";

import { useState, useEffect } from "react";
import { DailyLog, Phase } from "@/lib/types";
import { formatDate, parseLogDescription } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Activity, ChevronDown, Calendar, X, PencilLine, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react";

interface RecentActivityWidgetProps {
  recentLogs: DailyLog[];
  phases?: Phase[];
}

export function RecentActivityWidget({ recentLogs, phases = [] }: RecentActivityWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewLog, setViewLog] = useState<DailyLog | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [form, setForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    phase_id: "",
    deliverable_name: "",
    description: "",
    work_status: "In Progress",
    issues: "",
    category: "Labour",
    no_of_labour: "",
  });

  const [newDeliverable, setNewDeliverable] = useState("");
  const selectedPhase = phases.find((p) => p.id === form.phase_id);
  const deliverableOptions = (selectedPhase?.deliverables ?? []).map((d) => typeof d === "string" ? { name: d } : d);

  function startEditLog(log: DailyLog) {
    const { category, labour, cleanDescription } = parseLogDescription(log.description);
    setEditingLogId(log.id);
    setForm({
      log_date: log.log_date,
      phase_id: log.phase_id || "",
      deliverable_name: log.deliverable_name || "",
      description: cleanDescription || "",
      work_status: log.work_status || "In Progress",
      issues: log.issues || "",
      category: category || "Others",
      no_of_labour: labour || "",
    });
    setPhotoFiles([]);
    setShowForm(true);
    setViewLog(null);
  }

  async function handleDeleteLog(logId: string) {
    if (!window.confirm("Are you sure you want to permanently delete this daily log entry?")) {
      return;
    }
    try {
      const { error } = await supabase.from("daily_logs").delete().eq("id", logId);
      if (error) throw error;
      setViewLog(null);
      // Let the parent dashboard state sync via real-time subscription
    } catch (err) {
      console.error("Error deleting log:", err);
      alert("Failed to delete log. Please try again.");
    }
  }

  async function submitLog() {
    if (!form.phase_id || !form.deliverable_name || !form.description) return;
    setSaving(true);

    const originalLog = recentLogs.find((l) => l.id === editingLogId);
    const existingPhotos = originalLog?.photos || [];
    const uploadedPhotos = [...existingPhotos];

    for (const file of photoFiles) {
      const ext = file.name.split(".").pop();
      const path = `logs/${form.log_date}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("buildtrack-photos").upload(path, file, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("buildtrack-photos").getPublicUrl(path);
        uploadedPhotos.push({ url: urlData.publicUrl, caption: "" });
      }
    }

    const categoryTag = form.category ? `[Category: ${form.category}]` : "";
    const labourTag = (form.category === "Labour" && form.no_of_labour) ? `[Labour: ${form.no_of_labour}]` : "";
    const fullDescription = `${categoryTag}${labourTag} ${form.description}`.trim();

    const payload = {
      log_date: form.log_date,
      phase_id: form.phase_id || null,
      deliverable_name: form.deliverable_name || null,
      description: fullDescription,
      work_status: form.work_status,
      issues: form.issues || null,
      photos: uploadedPhotos,
    };

    const { error } = await supabase
      .from("daily_logs")
      .update(payload)
      .eq("id", editingLogId);

    if (!error) {
      setShowForm(false);
      setEditingLogId(null);
      setPhotoFiles([]);
    } else {
      console.error("Error updating log:", error);
      alert("Failed to save changes. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-500 shrink-0" />
          <h2 className="font-semibold text-sm text-gray-900 text-left">Recent Activity & Logs</h2>
          {recentLogs.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {recentLogs.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/60 space-y-4 bg-gray-50/10">
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
              <p className="text-sm font-medium text-gray-950">No logs yet 📝</p>
              <p className="text-xs text-muted-foreground">Start tracking daily site progress logs.</p>
            </div>
          ) : (
            <div className="space-y-3.5 mt-4">
              {recentLogs.map((log) => {
                const { category, labour, cleanDescription } = parseLogDescription(log.description);
                return (
                  <div
                    key={log.id}
                    onClick={() => setViewLog(log)}
                    className="border border-border/50 rounded-xl p-3 bg-white hover:bg-gray-50/50 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-sans font-medium">{formatDate(log.log_date)}</span>
                      </div>
                      {log.work_status && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-100/50">
                          {log.work_status}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-800 font-semibold break-words leading-relaxed line-clamp-2">
                        {cleanDescription || "No description"}
                      </p>
                      {(category || labour) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {category && (
                            <span className="text-[9px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200/50">
                              📂 {category}
                            </span>
                          )}
                          {labour && (
                            <span className="text-[9px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200/40">
                              👷 {labour} workers
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View log modal */}
      {viewLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{formatDate(viewLog.log_date)}</h2>
              <button onClick={() => setViewLog(null)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {viewLog.photos && viewLog.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {viewLog.photos.map((p, i) => (
                    <img key={i} src={p.url} alt={p.caption ?? `Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewLog.work_status && <div><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold text-gray-900">{viewLog.work_status}</p></div>}
                {viewLog.deliverable_name && <div className="col-span-2"><p className="text-xs text-muted-foreground">Deliverable</p><p className="font-semibold text-blue-700">{viewLog.deliverable_name}</p></div>}
              </div>
              {(() => {
                const { category, labour, cleanDescription } = parseLogDescription(viewLog.description);
                return (
                  <>
                    {(category || labour) && (
                      <div className="grid grid-cols-2 gap-3 text-sm border-t border-b border-border/40 py-3">
                        {category && <div><p className="text-xs text-muted-foreground">Category</p><p className="font-semibold text-gray-800">📂 {category}</p></div>}
                        {labour && <div><p className="text-xs text-muted-foreground">No. of Labour</p><p className="font-semibold text-amber-800">👷 {labour} workers</p></div>}
                      </div>
                    )}
                    <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-gray-800 font-medium">{cleanDescription || "No description"}</p></div>
                  </>
                );
              })()}
              {viewLog.issues && <div><p className="text-xs text-muted-foreground mb-1">Issues</p><p className="text-sm text-red-700 font-medium">{viewLog.issues}</p></div>}

              <div className="flex gap-3 pt-3 border-t border-border/40">
                <button
                  onClick={() => startEditLog(viewLog)}
                  className="flex-1 h-11 border border-border text-gray-900 bg-white rounded-xl font-semibold text-xs hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <PencilLine className="h-3.5 w-3.5" /> Edit Log
                </button>
                <button
                  onClick={() => handleDeleteLog(viewLog.id)}
                  className="flex-1 h-11 border border-red-100 bg-white text-red-600 rounded-xl font-semibold text-xs hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col pb-safe">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Edit Log Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Category</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "Labour", label: "👷 Labour", activeColor: "bg-amber-100 border-amber-400 text-amber-900" },
                    { value: "Material", label: "🧱 Material", activeColor: "bg-orange-100 border-orange-400 text-orange-900" },
                    { value: "Equipment", label: "🚜 Equipment", activeColor: "bg-blue-100 border-blue-400 text-blue-900" },
                    { value: "Progress", label: "📈 Progress", activeColor: "bg-emerald-100 border-emerald-400 text-emerald-900" },
                    { value: "Others", label: "🔮 Others", activeColor: "bg-gray-100 border-gray-400 text-gray-950" },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, category: cat.value, no_of_labour: cat.value === "Labour" ? p.no_of_labour : "" }))}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        form.category === cat.value
                          ? `${cat.activeColor} shadow-xs scale-102`
                          : "bg-white border-border text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Date</label>
                  <input type="date" value={form.log_date} onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))} className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">No. of Workers</label>
                  <input
                    type="number"
                    disabled={form.category !== "Labour"}
                    value={form.no_of_labour}
                    onChange={(e) => setForm((p) => ({ ...p, no_of_labour: e.target.value }))}
                    className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white disabled:opacity-40 disabled:bg-gray-50 focus:border-gray-500 focus:outline-none"
                    placeholder={form.category === "Labour" ? "e.g. 5" : "N/A"}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Work Status</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "In Progress", label: "⏳ In Progress", activeColor: "bg-blue-100 border-blue-400 text-blue-900" },
                    { value: "On Track", label: "🟢 On Track", activeColor: "bg-emerald-100 border-emerald-400 text-emerald-900" },
                    { value: "Delayed", label: "🔴 Delayed", activeColor: "bg-red-100 border-red-400 text-red-900" },
                    { value: "Completed", label: "✅ Completed", activeColor: "bg-teal-100 border-teal-400 text-teal-900" },
                    { value: "Paused", label: "⏸️ Paused", activeColor: "bg-purple-100 border-purple-400 text-purple-900" },
                  ].map((sc) => (
                    <button
                      key={sc.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, work_status: sc.value }))}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        form.work_status === sc.value
                          ? `${sc.activeColor} shadow-xs scale-102`
                          : "bg-white border-border text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Phase *</label>
                  <select
                    value={form.phase_id}
                    onChange={(e) => setForm((p) => ({ ...p, phase_id: e.target.value, deliverable_name: "" }))}
                    className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-950 font-semibold focus:border-gray-500 focus:outline-none"
                  >
                    <option value="">Select phase...</option>
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Deliverable *</label>
                  <select
                    value={form.deliverable_name === "" ? "" : deliverableOptions.some((d) => d.name === form.deliverable_name) ? form.deliverable_name : "__new__"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__new__") {
                        setNewDeliverable(" ");
                        setForm((p) => ({ ...p, deliverable_name: "" }));
                      } else {
                        setNewDeliverable("");
                        setForm((p) => ({ ...p, deliverable_name: val }));
                      }
                    }}
                    disabled={!form.phase_id}
                    className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-955 font-semibold focus:border-gray-500 focus:outline-none disabled:opacity-40"
                  >
                    <option value="">Select deliverable...</option>
                    {deliverableOptions.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                    <option value="__new__">+ Add new deliverable...</option>
                  </select>
                  {newDeliverable !== "" && (
                    <input
                      type="text"
                      value={newDeliverable.trim()}
                      onChange={(e) => { setNewDeliverable(e.target.value); setForm((p) => ({ ...p, deliverable_name: e.target.value })); }}
                      className="w-full h-10 border border-border rounded-xl px-3 text-xs mt-2 focus:outline-none focus:border-gray-400 bg-white"
                      placeholder="Enter new deliverable name..."
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Work Description *</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full border border-border rounded-xl px-3.5 py-3 text-xs resize-none focus:outline-none focus:border-gray-400 bg-white text-gray-900 font-medium" rows={3} placeholder="Describe what progress was achieved today..." />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Issues (optional)</label>
                <textarea value={form.issues} onChange={(e) => setForm((p) => ({ ...p, issues: e.target.value }))} className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs resize-none focus:outline-none focus:border-gray-400 bg-white" rows={2} placeholder="Any issues or blockers encountered..." />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Progress Photos</label>
                <label className="flex items-center gap-3 w-full h-12 border-2 border-dashed border-sky-200 bg-sky-50/10 hover:bg-sky-50/30 rounded-xl px-3.5 cursor-pointer hover:border-sky-400 transition-colors">
                  <Upload className="h-4 w-4 text-sky-600 flex-shrink-0" />
                  <span className="text-xs text-sky-700 font-semibold truncate">
                    {photoFiles.length > 0 ? `${photoFiles.length} photo${photoFiles.length !== 1 ? "s" : ""} selected` : "Tap to add site photos..."}
                  </span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 h-12 border border-border text-gray-900 bg-white rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={submitLog} disabled={saving || !form.phase_id || !form.deliverable_name || !form.description} className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Log"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
