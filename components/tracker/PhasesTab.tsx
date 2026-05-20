"use client";

import { useState, useRef, useEffect } from "react";
import { Phase, PhaseStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/upload";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Delayed: "bg-red-100 text-red-700",
};

const PHASE_COLORS = [
  { border: "border-l-violet-500", bg: "bg-violet-50", accent: "text-violet-600" },
  { border: "border-l-blue-500",   bg: "bg-blue-50",   accent: "text-blue-600" },
  { border: "border-l-emerald-500",bg: "bg-emerald-50",accent: "text-emerald-600" },
  { border: "border-l-amber-500",  bg: "bg-amber-50",  accent: "text-amber-600" },
  { border: "border-l-rose-500",   bg: "bg-rose-50",   accent: "text-rose-600" },
  { border: "border-l-cyan-500",   bg: "bg-cyan-50",   accent: "text-cyan-600" },
  { border: "border-l-orange-500", bg: "bg-orange-50", accent: "text-orange-600" },
  { border: "border-l-pink-500",   bg: "bg-pink-50",   accent: "text-pink-600" },
];

export function PhasesClient({ initialPhases }: { initialPhases: Phase[] }) {
  type Deliverable = { name: string; planned_due: string | null; actual_due: string | null };

  const [phases, setPhases] = useState(initialPhases);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Phase>>({});
  const [deliverableEdits, setDeliverableEdits] = useState<Record<number, { planned_start?: string; actual_due?: string; name?: string }>>({});
  const [newDeliverableName, setNewDeliverableName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [phaseReceipts, setPhaseReceipts] = useState<{id: string; item_name: string; actual_cost: number | null; receipt_url: string}[]>([]);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhase, setNewPhase] = useState<{ name: string; start_date: string; end_date: string; deliverables: string[] }>({ name: "", start_date: "", end_date: "", deliverables: [] });
  const [addingPhase, setAddingPhase] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ phaseId: string, index: number } | null>(null);

  // Fetch photos and receipts for expanded phase
  useEffect(() => {
    if (!expanded) {
      setPhaseReceipts([]);
      return;
    }
    // Load photo_url values from deliverables for the expanded phase
    const phase = phases.find(p => p.id === expanded);
    if (phase?.deliverables) {
      const loaded: Record<string, string> = {};
      (phase.deliverables as any[]).forEach((d, i) => {
        if (d?.photo_url) loaded[`${expanded}_${i}`] = d.photo_url;
      });
      setPhotos(prev => ({ ...prev, ...loaded }));
    }
    // Load receipt_url from budget_items for this phase
    (async () => {
      const { data: budgetItems } = await supabase
        .from("budget_items")
        .select("id, item_name, actual_cost, receipt_url")
        .eq("phase_id", expanded)
        .not("receipt_url", "is", null);
      setPhaseReceipts((budgetItems as any[] ?? []) as {id: string; item_name: string; actual_cost: number | null; receipt_url: string}[]);
    })();
  }, [expanded]);

  async function savePhase(id: string) {
    setSaving(true);
    // Merge deliverable actual_due edits
    const updatedDeliverables = (editing.deliverables ?? []).map((item, i) => {
      const d = typeof item === "string" ? { name: item, planned_start: null, planned_due: null, actual_due: null } : item;
      const edits = deliverableEdits[i];
      if (!edits) return d;
      return {
        ...d,
        ...(edits.name !== undefined && edits.name.trim() ? { name: edits.name.trim() } : {}),
        ...(edits.planned_start !== undefined ? { planned_start: edits.planned_start || null } : {}),
        ...(edits.actual_due !== undefined ? { actual_due: edits.actual_due || null } : {}),
      };
    });
    // Append new deliverable if typed
    if (newDeliverableName.trim()) {
      updatedDeliverables.push({ name: newDeliverableName.trim(), planned_start: null, planned_due: null, actual_due: null });
      setNewDeliverableName("");
    }
    // Derive actual_start_date from earliest planned_start, actual_end_date from latest planned_due
    const plannedStarts = updatedDeliverables.map((d) => d.planned_start).filter(Boolean) as string[];
    const plannedDues = updatedDeliverables.map((d) => d.planned_due).filter(Boolean) as string[];
    const derivedActualStart = plannedStarts.length > 0 ? plannedStarts.sort()[0] : editing.actual_start_date ?? null;
    const derivedActualEnd = plannedDues.length > 0 ? plannedDues.sort().at(-1)! : editing.actual_end_date ?? null;
    const payload = {
      ...editing,
      deliverables: updatedDeliverables,
      actual_start_date: derivedActualStart,
      actual_end_date: derivedActualEnd,
    };
    const { data, error } = await supabase
      .from("phases")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setPhases((prev) => prev.map((p) => (p.id === id ? (data as Phase) : p)));
      setDeliverableEdits({});
    }
    setSaving(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !uploadTarget) return;
    const file = e.target.files[0];
    const { phaseId, index } = uploadTarget;
    
    const targetKey = `${phaseId}_${index}`;
    setUploading(targetKey);

    const fileExt = file.name.split('.').pop();
    const fileName = `${index}_${Date.now()}.${fileExt}`;
    const filePath = `deliverables/${phaseId}/${fileName}`;

    try {
      const url = await uploadFile(file);
      setPhotos(prev => ({ ...prev, [targetKey]: url }));

      const phase = phases.find(p => p.id === phaseId);
      if (phase) {
        const updatedDeliverables = (phase.deliverables as any[] ?? []).map((d: any, i: number) =>
          i === index ? { ...d, photo_url: url } : d
        );
        const { error: dbError } = await supabase.from("phases").update({ deliverables: updatedDeliverables }).eq("id", phaseId);
        if (dbError) throw dbError;
        setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, deliverables: updatedDeliverables } : p));
      }
    } catch (err) {
      setPhotos(prev => { const n = { ...prev }; delete n[targetKey]; return n; });
      alert(`Error uploading photo: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    
    setUploading(null);
    setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }


  async function insertPhase() {
    if (!newPhase.name || !newPhase.start_date || !newPhase.end_date) return;
    setAddingPhase(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("phases").insert({
      project_id: phases[0].project_id,
      user_id: user?.id,
      phase_number: phases.length + 1,
      name: newPhase.name,
      start_date: newPhase.start_date,
      end_date: newPhase.end_date,
      status: "Not Started",
      deliverables: newPhase.deliverables.filter(Boolean).map(name => ({ name, planned_start: null, planned_due: null, actual_due: null })),
    }).select().single();
    setAddingPhase(false);
    if (error) {
      console.error("insertPhase error:", error);
      alert(`Failed to add phase: ${error.message}`);
      return;
    }
    if (data) {
      setPhases(prev => [...prev, data as Phase]);
      setShowAddPhase(false);
      setNewPhase({ name: "", start_date: "", end_date: "", deliverables: [] });
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900">Phases</h1>
        <p className="text-sm text-muted-foreground">May 14 — Sep 20, 2026</p>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      <div className="space-y-3">
        {phases.map((phase) => {
          const isOpen = expanded === phase.id;
          const isOverdue = phase.status !== "Completed" && new Date(phase.end_date) < new Date();

          const phaseColor = PHASE_COLORS[((phase.phase_number ?? 1) - 1) % PHASE_COLORS.length] ?? PHASE_COLORS[0];

          return (
            <div key={phase.id} className={`${phaseColor.bg} rounded-xl shadow-sm border-l-4 border border-border overflow-hidden ${phaseColor.border} ${isOverdue ? "border-red-200" : ""}`}>
              <button
                onClick={() => {
                  setExpanded(isOpen ? null : phase.id);
                  setEditing({ status: phase.status, actual_start_date: phase.actual_start_date, actual_end_date: phase.actual_end_date, notes: phase.notes, deliverables: phase.deliverables });
                  setDeliverableEdits({});
                  setNewDeliverableName("");
                }}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${phaseColor.accent}`}>Phase {phase.phase_number}</span>
                      {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Overdue</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mt-0.5">{phase.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(phase.start_date)} — {formatDate(phase.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[phase.status]}`}>
                      {phase.status}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Deliverables */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Deliverables</p>
                    <div className="space-y-3">
                        {(phase.deliverables ?? []).map((item, i) => {
                          const d = typeof item === "string" ? { name: item, planned_start: null, planned_due: null, actual_due: null } : item;
                          const targetKey = `${phase.id}_${i}`;
                          const isUploading = uploading === targetKey;
                          const photoUrl = photos[targetKey];
                          const actualDueVal = deliverableEdits[i]?.actual_due !== undefined ? deliverableEdits[i].actual_due! : (d.actual_due ?? "");
                          const plannedStartVal = deliverableEdits[i]?.planned_start !== undefined ? deliverableEdits[i].planned_start! : (d.planned_start ?? "");
                          const isLate = d.planned_due && !actualDueVal && new Date(d.planned_due) < new Date();

                          return (
                            <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-border">
                              <div className="flex items-start gap-2 text-sm">
                                {actualDueVal ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isLate ? "text-red-300" : "text-gray-300"}`} />
                                )}
                                <input
                                  type="text"
                                  value={deliverableEdits[i]?.name !== undefined ? deliverableEdits[i].name! : d.name}
                                  onChange={(e) => setDeliverableEdits((prev) => ({ ...prev, [i]: { ...prev[i], name: e.target.value } }))}
                                  className="flex-1 h-8 border border-border rounded-md px-2 text-xs bg-white font-medium text-gray-700 focus:outline-none focus:border-gray-400"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2 pl-6">
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Planned start</p>
                                  <input
                                    type="date"
                                    value={plannedStartVal}
                                    onChange={(e) => setDeliverableEdits((prev) => ({ ...prev, [i]: { ...prev[i], planned_start: e.target.value } }))}
                                    className="w-full h-8 border border-border rounded-md px-2 text-xs bg-white"
                                  />
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Planned due</p>
                                  <p className={`text-xs font-medium pt-1.5 ${isLate ? "text-red-600" : "text-gray-700"}`}>
                                    {d.planned_due ? formatDate(d.planned_due) : "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">Actual due</p>
                                  <input
                                    type="date"
                                    value={actualDueVal}
                                    onChange={(e) => setDeliverableEdits((prev) => ({ ...prev, [i]: { ...prev[i], actual_due: e.target.value } }))}
                                    className="w-full h-8 border border-border rounded-md px-2 text-xs bg-white"
                                  />
                                </div>
                              </div>
                              
                              {/* Photo Upload & Display */}
                              <div className="pl-6 mt-1">
                                {photoUrl ? (
                                  <div className="relative group rounded-md overflow-hidden border border-border bg-gray-200 aspect-video max-w-xs">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photoUrl} alt="Deliverable" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          setUploadTarget({ phaseId: phase.id, index: i });
                                          fileInputRef.current?.click();
                                        }}
                                        className="text-white text-xs font-medium px-3 py-1.5 bg-gray-900/80 rounded-full flex items-center gap-1.5"
                                      >
                                        <Upload className="h-3 w-3" /> Replace
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    disabled={isUploading}
                                    onClick={() => {
                                      setUploadTarget({ phaseId: phase.id, index: i });
                                      fileInputRef.current?.click();
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                                  >
                                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                                    {isUploading ? "Uploading..." : "Add Photo"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Add new deliverable */}
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-dashed border-border">
                          <input
                            type="text"
                            value={newDeliverableName}
                            onChange={(e) => setNewDeliverableName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newDeliverableName.trim()) {
                                setEditing((p) => ({ ...p, deliverables: [...(p.deliverables ?? []), { name: newDeliverableName.trim(), planned_start: null, planned_due: null, actual_due: null }] }));
                                setNewDeliverableName("");
                              }
                            }}
                            className="flex-1 h-8 border border-border rounded-md px-2 text-xs bg-white focus:outline-none focus:border-gray-400"
                            placeholder="New deliverable name..."
                          />
                          <button
                            type="button"
                            disabled={!newDeliverableName.trim()}
                            onClick={() => {
                              if (!newDeliverableName.trim()) return;
                              setEditing((p) => ({ ...p, deliverables: [...(p.deliverables ?? []), { name: newDeliverableName.trim(), planned_start: null, planned_due: null, actual_due: null }] }));
                              setNewDeliverableName("");
                            }}
                            className="h-8 px-3 text-xs font-semibold bg-gray-900 text-white rounded-md disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                  {/* Receipts from budget items */}
                  {phaseReceipts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Receipts</p>
                      <div className="flex gap-2 flex-wrap">
                        {phaseReceipts.map(r => (
                          <div key={r.id} className="relative">
                            <a href={r.receipt_url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={r.receipt_url} alt={r.item_name} className="h-16 w-16 object-cover rounded-lg border border-border" />
                            </a>
                            <p className="text-[9px] text-gray-500 mt-0.5 max-w-[64px] truncate">{r.item_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit fields */}
                  <div className="pt-2">
                    <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                    <select
                      value={editing.status ?? phase.status}
                      onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value as PhaseStatus }))}
                      className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white"
                    >
                      {["Not Started", "In Progress", "Completed", "Delayed"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Actual Start</label>
                      <input
                        type="date"
                        value={editing.actual_start_date ?? ""}
                        onChange={(e) => setEditing((p) => ({ ...p, actual_start_date: e.target.value || null }))}
                        className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Actual End</label>
                      <input
                        type="date"
                        value={editing.actual_end_date ?? ""}
                        onChange={(e) => setEditing((p) => ({ ...p, actual_end_date: e.target.value || null }))}
                        className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Notes</label>
                    <textarea
                      value={editing.notes ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, notes: e.target.value || null }))}
                      className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none"
                      rows={3}
                      placeholder="Add phase notes..."
                    />
                  </div>

                  <button
                    onClick={() => savePhase(phase.id)}
                    disabled={saving}
                    className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowAddPhase(true)}
        className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm mt-2"
      >
        + Add Phase
      </button>

      {showAddPhase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Add Phase</h2>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Phase Name</label>
              <input
                type="text"
                value={newPhase.name}
                onChange={(e) => setNewPhase(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Parapet Wall"
                className="w-full h-10 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={newPhase.start_date}
                  onChange={(e) => setNewPhase(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full h-10 border border-border rounded-lg px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">End Date</label>
                <input
                  type="date"
                  value={newPhase.end_date}
                  onChange={(e) => setNewPhase(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full h-10 border border-border rounded-lg px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Deliverables</label>
              <div className="space-y-2">
                {newPhase.deliverables.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={d}
                      onChange={(e) => setNewPhase(p => ({ ...p, deliverables: p.deliverables.map((x, j) => j === i ? e.target.value : x) }))}
                      className="flex-1 h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <button
                      onClick={() => setNewPhase(p => ({ ...p, deliverables: p.deliverables.filter((_, j) => j !== i) }))}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewPhase(p => ({ ...p, deliverables: [...p.deliverables, ""] }))}
                  className="text-xs text-blue-600 font-medium hover:text-blue-800"
                >
                  + Add Deliverable
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowAddPhase(false); setNewPhase({ name: "", start_date: "", end_date: "", deliverables: [] }); }}
                className="flex-1 h-11 border border-border rounded-xl text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={insertPhase}
                disabled={addingPhase || !newPhase.name || !newPhase.start_date || !newPhase.end_date}
                className="flex-1 h-11 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {addingPhase ? "Saving..." : "Add Phase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
