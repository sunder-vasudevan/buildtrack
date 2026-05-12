"use client";

import { useState } from "react";
import { DailyLog, Phase } from "@/lib/types";
import { formatDate, parseLogDescription } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Plus, X, Image, Upload, Loader2 } from "lucide-react";

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Overcast", "Hot"];
const STATUS_OPTIONS = ["In Progress", "On Track", "Delayed", "Completed", "Paused"];

export function LogsClient({
  initialLogs,
  phases,
}: {
  initialLogs: DailyLog[];
  phases: Phase[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [viewLog, setViewLog] = useState<DailyLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    phase_id: "",
    deliverable_name: "",
    description: "",
    weather: "Sunny",
    work_status: "In Progress",
    issues: "",
    category: "Labour",
    no_of_labour: "",
  });

  const [newDeliverable, setNewDeliverable] = useState("");
  const selectedPhase = phases.find((p) => p.id === form.phase_id);
  const deliverableOptions = selectedPhase?.deliverables ?? [];

  // Get project_id from first log or leave blank
  const projectId = logs[0]?.project_id ?? null;

  async function submitLog() {
    if (!form.phase_id || !form.deliverable_name || !form.description) return;
    setSaving(true);

    // Need project_id — fetch it
    let pid = projectId;
    if (!pid) {
      const { data } = await supabase.from("projects").select("id").single();
      pid = data?.id ?? null;
    }

    // Upload photos to Supabase Storage
    const uploadedPhotos: { url: string; caption: string }[] = [];
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
      project_id: pid,
      log_date: form.log_date,
      phase_id: form.phase_id || null,
      deliverable_name: form.deliverable_name || null,
      description: fullDescription,
      weather: form.weather,
      work_status: form.work_status,
      issues: form.issues || null,
      photos: uploadedPhotos,
    };

    const { data, error } = await supabase.from("daily_logs").insert(payload).select().single();
    if (!error && data) {
      setLogs((prev) => [data as DailyLog, ...prev]);
      setShowForm(false);
      setPhotoFiles([]);
      setForm({
        log_date: new Date().toISOString().split("T")[0],
        phase_id: "",
        deliverable_name: "",
        description: "",
        weather: "Sunny",
        work_status: "In Progress",
        issues: "",
        category: "Labour",
        no_of_labour: "",
      });
    }
    setSaving(false);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Logs</h1>
          <p className="text-sm text-muted-foreground">{logs.length} entries</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Log
        </button>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <p className="text-muted-foreground text-sm">No logs yet. Tap "Add Log" to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              onClick={() => setViewLog(log)}
              className="bg-white rounded-xl p-4 shadow-sm border border-border cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {log.photos && log.photos.length > 0 ? (
                    <img src={log.photos[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <Image className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-500">{formatDate(log.log_date)}</p>
                    {log.work_status && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{log.work_status}</span>
                    )}
                  </div>
                  {(() => {
                    const { category, labour, cleanDescription } = parseLogDescription(log.description);
                    return (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-800 line-clamp-2 mt-0.5">{cleanDescription || "No description"}</p>
                        {(category || labour) && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {category && (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200/50">
                                📂 {category}
                              </span>
                            )}
                            {labour && (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/40">
                                👷 {labour} workers
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {log.weather && <span>☁️ {log.weather}</span>}
                    {log.photos && log.photos.length > 0 && <span>📷 {log.photos.length} photo{log.photos.length !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Log modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">New Log Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Date</label>
                  <input type="date" value={form.log_date} onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))} className="w-full h-11 border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">No. of Workers</label>
                  <input
                    type="number"
                    disabled={form.category !== "Labour"}
                    value={form.no_of_labour}
                    onChange={(e) => setForm((p) => ({ ...p, no_of_labour: e.target.value }))}
                    className="w-full h-11 border border-border rounded-xl px-3 text-sm disabled:opacity-40 disabled:bg-gray-50 focus:border-gray-500 focus:outline-none"
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

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Phase</label>
                <select value={form.phase_id} onChange={(e) => { setForm((p) => ({ ...p, phase_id: e.target.value, deliverable_name: "" })); setNewDeliverable(""); }} className="w-full h-11 border border-border rounded-xl px-3 text-sm bg-white focus:outline-none focus:border-gray-400">
                  <option value="">No phase selected</option>
                  {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                </select>
              </div>

              {form.phase_id && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Deliverable</label>
                  <select
                    value={newDeliverable ? "__new__" : form.deliverable_name}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setNewDeliverable(" ");
                        setForm((p) => ({ ...p, deliverable_name: "" }));
                      } else {
                        setNewDeliverable("");
                        setForm((p) => ({ ...p, deliverable_name: e.target.value }));
                      }
                    }}
                    className="w-full h-11 border border-border rounded-xl px-3 text-sm bg-white focus:outline-none focus:border-gray-400"
                  >
                    <option value="">No deliverable selected</option>
                    {deliverableOptions.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                    <option value="__new__">+ Add new deliverable...</option>
                  </select>
                  {newDeliverable !== "" && (
                    <input
                      type="text"
                      value={newDeliverable.trim()}
                      onChange={(e) => { setNewDeliverable(e.target.value); setForm((p) => ({ ...p, deliverable_name: e.target.value })); }}
                      className="w-full h-10 border border-border rounded-xl px-3 text-sm mt-2 focus:outline-none focus:border-gray-400"
                      placeholder="Enter new deliverable name..."
                    />
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Work Description *</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full border border-border rounded-xl px-3.5 py-3 text-xs resize-none focus:outline-none focus:border-gray-400" rows={3} placeholder="Describe what progress was achieved today..." />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Weather Condition</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "Sunny", label: "☀️ Sunny", activeColor: "bg-amber-50 border-amber-300 text-amber-800" },
                    { value: "Cloudy", label: "☁️ Cloudy", activeColor: "bg-blue-50 border-blue-200 text-blue-700" },
                    { value: "Rainy", label: "🌧️ Rainy", activeColor: "bg-indigo-50 border-indigo-300 text-indigo-700" },
                    { value: "Overcast", label: "🌫️ Overcast", activeColor: "bg-slate-100 border-slate-300 text-slate-700" },
                    { value: "Hot", label: "🥵 Hot", activeColor: "bg-red-50 border-red-300 text-red-800" },
                  ].map((wc) => (
                    <button
                      key={wc.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, weather: wc.value }))}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        form.weather === wc.value
                          ? `${wc.activeColor} shadow-xs scale-102`
                          : "bg-white border-border text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {wc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Issues (optional)</label>
                <textarea value={form.issues} onChange={(e) => setForm((p) => ({ ...p, issues: e.target.value }))} className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs resize-none focus:outline-none focus:border-gray-400" rows={2} placeholder="Any issues or blockers encountered..." />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Progress Photos</label>
                <label className="flex items-center gap-3 w-full h-12 border-2 border-dashed border-sky-200 bg-sky-50/10 hover:bg-sky-50/30 rounded-xl px-3.5 cursor-pointer hover:border-sky-400 transition-colors">
                  <Upload className="h-4 w-4 text-sky-600 flex-shrink-0" />
                  <span className="text-xs text-sky-700 font-semibold truncate">
                    {photoFiles.length > 0 ? `${photoFiles.length} photo${photoFiles.length !== 1 ? "s" : ""} selected` : "Tap to add site photos..."}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
                  />
                </label>
                {photoFiles.length > 0 && (
                  <button onClick={() => setPhotoFiles([])} className="text-xs text-red-500 font-semibold mt-1">Remove all selected</button>
                )}
              </div>
              <button onClick={submitLog} disabled={saving || !form.phase_id || !form.deliverable_name || !form.description} className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View log modal */}
      {viewLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{formatDate(viewLog.log_date)}</h2>
              <button onClick={() => setViewLog(null)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
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
                {viewLog.weather && <div><p className="text-xs text-muted-foreground">Weather</p><p className="font-medium">☁️ {viewLog.weather}</p></div>}
                {viewLog.work_status && <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{viewLog.work_status}</p></div>}
                {viewLog.deliverable_name && <div className="col-span-2"><p className="text-xs text-muted-foreground">Deliverable</p><p className="font-medium text-blue-700">{viewLog.deliverable_name}</p></div>}
              </div>
              {(() => {
                const { category, labour, cleanDescription } = parseLogDescription(viewLog.description);
                return (
                  <>
                    {(category || labour) && (
                      <div className="grid grid-cols-2 gap-3 text-sm border-t border-b border-border/40 py-3">
                        {category && <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium text-gray-800">📂 {category}</p></div>}
                        {labour && <div><p className="text-xs text-muted-foreground">No. of Labour</p><p className="font-medium text-amber-800">👷 {labour} workers</p></div>}
                      </div>
                    )}
                    <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-gray-800">{cleanDescription || "No description"}</p></div>
                  </>
                );
              })()}
              {viewLog.issues && <div><p className="text-xs text-muted-foreground mb-1">Issues</p><p className="text-sm text-red-700">{viewLog.issues}</p></div>}
              {viewLog.resolution && <div><p className="text-xs text-muted-foreground mb-1">Resolution</p><p className="text-sm text-emerald-700">{viewLog.resolution}</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
