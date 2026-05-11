"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, PencilLine, Receipt, Landmark, Loader2, Upload, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";

type Screen = "menu" | "expense" | "log" | "funds" | "reminder";

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Overcast", "Hot"];
const STATUS_OPTIONS = ["In Progress", "On Track", "Delayed", "Completed", "Paused"];

type Phase = { id: string; name: string; deliverables: { name: string }[] | null };

function QuickLogForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [newDeliverable, setNewDeliverable] = useState("");
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split("T")[0],
    phase_id: "",
    deliverable_name: "",
    description: "",
    weather: "Sunny",
    work_status: "In Progress",
    issues: "",
  });

  useEffect(() => {
    supabase.from("phases").select("id, name, deliverables").order("phase_number").then(({ data }) => {
      if (data) setPhases(data as Phase[]);
    });
  }, []);

  const selectedPhase = phases.find((p) => p.id === form.phase_id);
  const deliverableOptions = selectedPhase?.deliverables ?? [];

  async function handleSave() {
    if (!form.phase_id || !form.deliverable_name || !form.description) return;
    setSaving(true);
    const { data: project } = await supabase.from("projects").select("id").single();

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

    await supabase.from("daily_logs").insert({
      project_id: project?.id,
      log_date: form.log_date,
      phase_id: form.phase_id || null,
      deliverable_name: form.deliverable_name || null,
      description: form.description,
      weather: form.weather,
      work_status: form.work_status,
      issues: form.issues || null,
      photos: uploadedPhotos,
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Log Work Done</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Date</label>
              <input type="date" value={form.log_date} onChange={(e) => setForm((p) => ({ ...p, log_date: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
              <select value={form.work_status} onChange={(e) => setForm((p) => ({ ...p, work_status: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Phase</label>
            <select value={form.phase_id} onChange={(e) => { setForm((p) => ({ ...p, phase_id: e.target.value, deliverable_name: "" })); setNewDeliverable(""); }} className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white">
              <option value="">No phase selected</option>
              {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
            </select>
          </div>
          {form.phase_id && (
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Deliverable</label>
              <select
                value={newDeliverable ? "__new__" : form.deliverable_name}
                onChange={(e) => {
                  if (e.target.value === "__new__") { setNewDeliverable(" "); setForm((p) => ({ ...p, deliverable_name: "" })); }
                  else { setNewDeliverable(""); setForm((p) => ({ ...p, deliverable_name: e.target.value })); }
                }}
                className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white"
              >
                <option value="">No deliverable selected</option>
                {deliverableOptions.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                <option value="__new__">+ Add new deliverable...</option>
              </select>
              {newDeliverable !== "" && (
                <input type="text" value={newDeliverable.trim()} onChange={(e) => { setNewDeliverable(e.target.value); setForm((p) => ({ ...p, deliverable_name: e.target.value })); }} className="w-full h-10 border border-border rounded-lg px-3 text-sm mt-2" placeholder="Enter new deliverable name..." />
              )}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Work Description *</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none" rows={4} placeholder="What was done today..." />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Weather</label>
            <select value={form.weather} onChange={(e) => setForm((p) => ({ ...p, weather: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white">
              {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Issues (optional)</label>
            <textarea value={form.issues} onChange={(e) => setForm((p) => ({ ...p, issues: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none" rows={2} placeholder="Any issues..." />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Photos</label>
            <label className="flex items-center gap-3 w-full h-12 border-2 border-dashed border-border rounded-lg px-3 cursor-pointer hover:border-gray-400 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {photoFiles.length > 0 ? `${photoFiles.length} photo${photoFiles.length !== 1 ? "s" : ""} selected` : "Tap to add photos"}
              </span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !form.phase_id || !form.deliverable_name || !form.description} className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Log"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickFundsForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    source: "",
    amount: "",
    date_received: new Date().toISOString().split("T")[0],
    notes: "",
  });

  async function handleSave() {
    if (!form.source || !form.amount) { setError("Source and amount are required."); return; }
    setSaving(true);
    setError("");
    const { data: project, error: projectErr } = await supabase.from("projects").select("id").single();
    if (projectErr || !project?.id) { console.error("project fetch error:", projectErr); setError("Could not load project. Check Supabase connection."); setSaving(false); return; }
    const { error: insertError } = await supabase.from("income").insert({
      project_id: project?.id,
      source: form.source,
      amount: Number(form.amount),
      date_received: form.date_received,
      notes: form.notes || null,
    });
    if (insertError) { console.error("income insert error:", insertError); setError(`Failed to save: ${insertError.message}`); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Add Funds</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Source *</label>
            <input type="text" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm" placeholder="e.g. Personal savings, Bank loan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Date Received</label>
              <input type="date" value={form.date_received} onChange={(e) => setForm((p) => ({ ...p, date_received: e.target.value }))} className="w-full h-12 border border-border rounded-lg px-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none" rows={2} placeholder="Any additional notes..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickReminderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    text: "",
    due_date: "",
  });

  async function handleSave() {
    if (!form.text) { setError("Reminder text is required."); return; }
    setSaving(true);
    setError("");
    const { data: project } = await supabase.from("projects").select("id").single();
    const { error: insertError } = await supabase.from("reminders").insert({
      project_id: project?.id,
      text: form.text,
      due_date: form.due_date || null,
      done: false,
    });
    if (insertError) { setError("Failed to save. Try again."); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Quick Reminder</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Reminder *</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none"
              rows={3}
              placeholder="e.g. Call Ravi about steel delivery, Check window measurements..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Due Date (optional)</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              className="w-full h-12 border border-border rounded-lg px-3 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.text}
              className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Reminder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickAddModal() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");

  function handleClose() {
    setOpen(false);
    setTimeout(() => setScreen("menu"), 300);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setScreen("menu"); }}>
      <Dialog.Trigger asChild>
        <button className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg transform -translate-y-4 hover:scale-105 transition-transform focus:outline-none">
          <Plus className="h-6 w-6" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[90%] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-xl rounded-2xl">
          {/* Menu Screen */}
          {screen === "menu" && (
            <>
              <div className="flex flex-col space-y-1.5">
                <Dialog.Title className="text-xl font-bold leading-none tracking-tight">Quick Add</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-2">
                  What would you like to log today?
                </Dialog.Description>
              </div>
              <div className="grid gap-3 py-2">
                <button
                  onClick={() => setScreen("log")}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors"
                >
                  <div className="bg-blue-100 p-3 rounded-full"><PencilLine className="h-6 w-6 text-blue-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Add Works Completed</h4>
                    <p className="text-sm text-muted-foreground">Log daily progress with photos</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("expense")}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors"
                >
                  <div className="bg-emerald-100 p-3 rounded-full"><Receipt className="h-6 w-6 text-emerald-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Add Expense / Receipt</h4>
                    <p className="text-sm text-muted-foreground">Record a payment with optional receipt</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("funds")}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors"
                >
                  <div className="bg-orange-100 p-3 rounded-full"><Landmark className="h-6 w-6 text-orange-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Add Funds</h4>
                    <p className="text-sm text-muted-foreground">Record capital received for the project</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("reminder")}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-border text-left transition-colors"
                >
                  <div className="bg-purple-100 p-3 rounded-full"><Bell className="h-6 w-6 text-purple-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Reminder / Followup</h4>
                    <p className="text-sm text-muted-foreground">Set a reminder or followup task</p>
                  </div>
                </button>
              </div>
              <Dialog.Close asChild>
                <button className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </>
          )}

          {/* Form Screens */}
          {screen === "log" && <QuickLogForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} />}
          {screen === "expense" && <ExpenseForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} />}
          {screen === "funds" && <QuickFundsForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} />}
          {screen === "reminder" && <QuickReminderForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Not Started": "bg-gray-100 text-gray-600",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Delayed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
