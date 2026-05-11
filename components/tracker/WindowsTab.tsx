"use client";

import { useState } from "react";
import { Window, WindowStatus } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Not Ordered": "bg-gray-100 text-gray-600",
  Ordered: "bg-blue-100 text-blue-700",
  "In Transit": "bg-amber-100 text-amber-700",
  Installed: "bg-green-100 text-green-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

const ALERT_BADGES: Record<string, string> = {
  PRIVACY: "bg-red-100 text-red-700 border border-red-200",
  FROSTED: "bg-orange-100 text-orange-700 border border-orange-200",
  LOUVRE: "bg-green-100 text-green-700 border border-green-200",
};

type Filter = "all" | "required" | "optional";

export function WindowsClient({
  initialWindows,
}: {
  initialWindows: Window[];
}) {
  const [windows, setWindows] = useState(initialWindows);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Window | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<Partial<Window>>({});

  const filtered = windows.filter((w) => {
    if (filter === "required") return w.is_required;
    if (filter === "optional") return !w.is_required;
    return true;
  });

  function openModal(w: Window) {
    setSelected(w);
    setFormState({
      status: w.status,
      actual_cost: w.actual_cost,
      ordered_date: w.ordered_date,
      delivery_date: w.delivery_date,
      installed_date: w.installed_date,
      notes: w.notes,
    });
  }

  async function saveWindow() {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("windows")
      .update(formState)
      .eq("id", selected.id)
      .select()
      .single();
    if (!error && data) {
      setWindows((prev) => prev.map((w) => (w.id === data.id ? (data as Window) : w)));
      setSelected(null);
    }
    setSaving(false);
  }

  function getAlerts(w: Window): string[] {
    if (!w.critical_notes) return [];
    return ["PRIVACY", "FROSTED", "LOUVRE"].filter((a) =>
      w.critical_notes!.toUpperCase().includes(a)
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900">Windows</h1>
        <p className="text-sm text-muted-foreground">{windows.filter((w) => w.is_required).length} required · {windows.filter((w) => !w.is_required).length} optional</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {(["all", "required", "optional"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-border"
            }`}
          >
            {f === "all" ? `All (${windows.length})` : f === "required" ? `Required (${windows.filter((w) => w.is_required).length})` : `Optional (${windows.filter((w) => !w.is_required).length})`}
          </button>
        ))}
      </div>

      {/* Window cards */}
      <div className="space-y-3">
        {filtered.map((w) => {
          const alerts = getAlerts(w);
          return (
            <div
              key={w.id}
              onClick={() => openModal(w)}
              className="bg-white rounded-xl p-4 shadow-sm border border-border cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-400">#{w.window_id}</span>
                    <h3 className="font-semibold text-gray-900 text-sm">{w.room} — {w.wall}</h3>
                    {!w.is_required && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Optional</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {w.width} × {w.height}{w.sill_height ? ` · Sill ${w.sill_height}` : ""}
                  </p>
                  {alerts.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {alerts.map((a) => (
                        <span key={a} className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${ALERT_BADGES[a]}`}>
                          <AlertTriangle className="h-3 w-3" />{a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[w.status]}`}>
                    {w.status}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {w.actual_cost ? formatINR(w.actual_cost) : w.quoted_cost ? formatINR(w.quoted_cost) + " est." : "—"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">#{selected.window_id} {selected.room} — {selected.wall}</h2>
                <p className="text-xs text-muted-foreground">{selected.width} × {selected.height}{selected.sill_height ? ` · Sill ${selected.sill_height}` : ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-muted-foreground hover:text-gray-900">✕</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Critical notes */}
              {selected.critical_notes && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Critical Notes
                  </p>
                  <p className="text-sm text-red-600 mt-1">{selected.critical_notes}</p>
                </div>
              )}

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{selected.type ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Required</p><p className="font-medium">{selected.is_required ? "Yes" : "No"}</p></div>
                <div><p className="text-xs text-muted-foreground">Quoted Cost</p><p className="font-medium">{formatINR(selected.quoted_cost)}</p></div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                <select
                  value={formState.status ?? selected.status}
                  onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value as WindowStatus }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white"
                >
                  {["Not Ordered", "Ordered", "In Transit", "Installed", "Completed"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Actual cost */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Actual Cost (₹)</label>
                <input
                  type="number"
                  value={formState.actual_cost ?? ""}
                  onChange={(e) => setFormState((p) => ({ ...p, actual_cost: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  placeholder="Enter actual cost"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: "ordered_date" as const, label: "Ordered Date" },
                  { key: "delivery_date" as const, label: "Delivery Date" },
                  { key: "installed_date" as const, label: "Installed Date" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
                    <input
                      type="date"
                      value={(formState[key] as string) ?? ""}
                      onChange={(e) => setFormState((p) => ({ ...p, [key]: e.target.value || null }))}
                      className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                    />
                  </div>
                ))}
              </div>



              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Notes</label>
                <textarea
                  value={formState.notes ?? ""}
                  onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value || null }))}
                  className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none"
                  rows={3}
                  placeholder="Add notes..."
                />
              </div>

              {/* Save */}
              <button
                onClick={saveWindow}
                disabled={saving}
                className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
