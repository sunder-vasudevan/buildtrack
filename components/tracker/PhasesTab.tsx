"use client";

import { useState, useRef, useEffect } from "react";
import { Phase, PhaseStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Delayed: "bg-red-100 text-red-700",
};

export function PhasesClient({ initialPhases }: { initialPhases: Phase[] }) {
  const [phases, setPhases] = useState(initialPhases);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Phase>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ phaseId: string, index: number } | null>(null);

  // Fetch photos for expanded phase
  useEffect(() => {
    if (!expanded) return;
    
    async function loadPhotos() {
      const { data } = await supabase.storage.from("buildtrack-photos").list(`deliverables/${expanded}`);
      if (data) {
        const newPhotos = { ...photos };
        data.forEach(file => {
          // File format: index_filename.jpg
          const match = file.name.match(/^(\d+)_/);
          if (match) {
            const index = match[1];
            const { data: urlData } = supabase.storage.from("buildtrack-photos").getPublicUrl(`deliverables/${expanded}/${file.name}`);
            newPhotos[`${expanded}_${index}`] = urlData.publicUrl;
          }
        });
        setPhotos(newPhotos);
      }
    }
    loadPhotos();
  }, [expanded]);

  async function savePhase(id: string) {
    setSaving(true);
    const { data, error } = await supabase
      .from("phases")
      .update(editing)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setPhases((prev) => prev.map((p) => (p.id === id ? (data as Phase) : p)));
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

    const { error } = await supabase.storage.from("buildtrack-photos").upload(filePath, file, { upsert: true });
    
    if (!error) {
      const { data: urlData } = supabase.storage.from("buildtrack-photos").getPublicUrl(filePath);
      setPhotos(prev => ({ ...prev, [targetKey]: urlData.publicUrl }));
    } else {
      alert("Error uploading photo: " + error.message);
    }
    
    setUploading(null);
    setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

          return (
            <div key={phase.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isOverdue ? "border-red-200" : "border-border"}`}>
              <button
                onClick={() => {
                  setExpanded(isOpen ? null : phase.id);
                  setEditing({ status: phase.status, actual_start_date: phase.actual_start_date, actual_end_date: phase.actual_end_date, notes: phase.notes });
                }}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400">Phase {phase.phase_number}</span>
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
                  {phase.deliverables && phase.deliverables.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Deliverables</p>
                      <div className="space-y-3">
                        {phase.deliverables.map((d, i) => {
                          const targetKey = `${phase.id}_${i}`;
                          const isUploading = uploading === targetKey;
                          const photoUrl = photos[targetKey];

                          return (
                            <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-border">
                              <div className="flex items-start gap-2 text-sm">
                                {phase.status === "Completed" ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-gray-700 flex-1 leading-snug">
                                  {d} <span className="text-muted-foreground text-xs block mt-1">Due: {formatDate(phase.end_date)}</span>
                                </span>
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
    </div>
  );
}
