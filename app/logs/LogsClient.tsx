"use client";

import { useState } from "react";
import { DailyLog, Phase } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Plus, X, Image } from "lucide-react";

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Overcast", "Hot"];
const STATUS_OPTIONS = ["In Progress", "On Track", "Delayed", "Completed", "Paused"];

export function LogsClient({
  initialLogs,
  phases,
}: {
  initialLogs: DailyLog[];
  phases: Pick<Phase, "id" | "name">[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [viewLog, setViewLog] = useState<DailyLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    phase_id: "",
    description: "",
    weather: "Sunny",
    work_status: "In Progress",
    issues: "",
  });

  // Get project_id from first log or leave blank
  const projectId = logs[0]?.project_id ?? null;

  async function submitLog() {
    if (!form.description) return;
    setSaving(true);

    // Need project_id — fetch it
    let pid = projectId;
    if (!pid) {
      const { data } = await supabase.from("projects").select("id").single();
      pid = data?.id ?? null;
    }

    const payload = {
      project_id: pid,
      log_date: form.log_date,
      phase_id: form.phase_id || null,
      description: form.description,
      weather: form.weather,
      work_status: form.work_status,
      issues: form.issues || null,
      photos: [],
    };

    const { data, error } = await supabase.from("daily_logs").insert(payload).select().single();
    if (!error && data) {
      setLogs((prev) => [data as DailyLog, ...prev]);
      setShowForm(false);
      setForm({ log_date: new Date().toISOString().split("T")[0], phase_id: "", description: "", weather: "Sunny", work_status: "In Progress", issues: "" });
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
                  <p className="text-sm text-gray-800 line-clamp-2 mt-0.5">{log.description}</p>
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
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Date</label>
                <input type="date" value={form.log_date} onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Phase</label>
                <select value={form.phase_id} onChange={(e) => setForm((p) => ({ ...p, phase_id: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white">
                  <option value="">No phase selected</option>
                  {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Work Description *</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none" rows={4} placeholder="What was done today..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Weather</label>
                  <select value={form.weather} onChange={(e) => setForm((p) => ({ ...p, weather: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white">
                    {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                  <select value={form.work_status} onChange={(e) => setForm((p) => ({ ...p, work_status: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Issues (optional)</label>
                <textarea value={form.issues} onChange={(e) => setForm((p) => ({ ...p, issues: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none" rows={2} placeholder="Any issues encountered..." />
              </div>
              <button onClick={submitLog} disabled={saving || !form.description} className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View log modal */}
      {viewLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
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
              </div>
              <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-gray-800">{viewLog.description}</p></div>
              {viewLog.issues && <div><p className="text-xs text-muted-foreground mb-1">Issues</p><p className="text-sm text-red-700">{viewLog.issues}</p></div>}
              {viewLog.resolution && <div><p className="text-xs text-muted-foreground mb-1">Resolution</p><p className="text-sm text-emerald-700">{viewLog.resolution}</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
