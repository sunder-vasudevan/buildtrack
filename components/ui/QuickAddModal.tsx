"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, PencilLine, Receipt, Landmark, Loader2, Upload, Bell, PenSquare, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";

type Screen = "menu" | "expense" | "log" | "funds" | "reminder" | "note" | "wish";

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
    category: "Labour",
    no_of_labour: "",
  });

  useEffect(() => {
    supabase.from("phases").select("id, name, deliverables").order("phase_number").then(({ data }) => {
      if (data) setPhases(data as Phase[]);
    });
  }, []);

  const selectedPhase = phases.find((p) => p.id === form.phase_id);
  const deliverableOptions = (selectedPhase?.deliverables ?? []).map((d) => typeof d === "string" ? { name: d } : d);

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

    const categoryTag = form.category ? `[Category: ${form.category}]` : "";
    const labourTag = (form.category === "Labour" && form.no_of_labour) ? `[Labour: ${form.no_of_labour}]` : "";
    const fullDescription = `${categoryTag}${labourTag} ${form.description}`.trim();

    await supabase.from("daily_logs").insert({
      project_id: project?.id,
      log_date: form.log_date,
      phase_id: form.phase_id || null,
      deliverable_name: form.deliverable_name || null,
      description: fullDescription,
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
                  if (e.target.value === "__new__") { setNewDeliverable(" "); setForm((p) => ({ ...p, deliverable_name: "" })); }
                  else { setNewDeliverable(""); setForm((p) => ({ ...p, deliverable_name: e.target.value })); }
                }}
                className="w-full h-11 border border-border rounded-xl px-3 text-sm bg-white focus:outline-none focus:border-gray-400"
              >
                <option value="">No deliverable selected</option>
                {deliverableOptions.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                <option value="__new__">+ Add new deliverable...</option>
              </select>
              {newDeliverable !== "" && (
                <input type="text" value={newDeliverable.trim()} onChange={(e) => { setNewDeliverable(e.target.value); setForm((p) => ({ ...p, deliverable_name: e.target.value })); }} className="w-full h-10 border border-border rounded-xl px-3 text-sm mt-2 focus:outline-none focus:border-gray-400" placeholder="Enter new deliverable name..." />
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
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !form.phase_id || !form.deliverable_name || !form.description} className="flex-1 h-12 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
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
          {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl p-3 border border-red-200">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Source *</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
              placeholder="e.g. Personal savings, Bank loan, Partner capital..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Amount (₹) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full h-11 border border-border rounded-xl px-3 text-xs font-sans font-bold bg-white text-gray-900 focus:border-gray-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Date Received</label>
              <input
                type="date"
                value={form.date_received}
                onChange={(e) => setForm((p) => ({ ...p, date_received: e.target.value }))}
                className="w-full h-11 border border-border rounded-xl px-3 text-xs font-sans font-semibold bg-white text-gray-900 focus:border-gray-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs resize-none focus:border-gray-500 focus:outline-none"
              rows={2}
              placeholder="Any details about the source, transaction ID, reference..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 border border-border text-gray-900 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : "Save Funds"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickNoteForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");

  async function handleSave() {
    if (!text.trim()) { setError("Note text is required."); return; }
    setSaving(true);
    setError("");
    const { data: project } = await supabase.from("projects").select("id").single();
    const { error: insertError } = await supabase.from("reminders").insert({
      project_id: project?.id,
      text: `[Note] ${text.trim()}`,
      done: false,
      due_date: null,
    });
    if (insertError) { setError("Failed to save. Try again."); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col space-y-1">
        <h3 className="font-bold text-gray-900 text-lg">Add Project Jotting</h3>
        <p className="text-xs text-muted-foreground">This note will appear instantly in your Project Jottings & Notepad inside the Project Info tab.</p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Your Jotting / Note *</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none focus:outline-none focus:border-gray-400"
          rows={4}
          placeholder="e.g. Discussed tile grout selection with contractors, decided on off-white matte..."
          autoFocus
        />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Note"}
        </button>
      </div>
    </div>
  );
}

function QuickReminderForm({ onClose, onSaved, initialType = "reminder" }: { onClose: () => void; onSaved: () => void; initialType?: "reminder" | "wish" }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<"reminder" | "wish">(initialType);
  const [form, setForm] = useState({
    text: "",
    due_date: "",
    phase_id: "",
  });
  const [phases, setPhases] = useState<Phase[]>([]);

  useEffect(() => {
    if (type === "wish") {
      supabase.from("phases").select("id, name").order("phase_number").then(({ data }) => {
        if (data) setPhases(data as Phase[]);
      });
    }
  }, [type]);

  async function handleSave() {
    if (!form.text) { setError("Text is required."); return; }
    setSaving(true);
    setError("");
    const { data: project } = await supabase.from("projects").select("id").single();
    
    let textToSave = form.text.trim();
    if (type === "wish") {
      const selectedPhase = phases.find(p => p.id === form.phase_id);
      if (selectedPhase) {
        textToSave = `[Wish] [Phase:${selectedPhase.id}|${selectedPhase.name}] ${textToSave}`;
      } else {
        textToSave = `[Wish] ${textToSave}`;
      }
    } else {
      textToSave = textToSave;
    }

    const { error: insertError } = await supabase.from("reminders").insert({
      project_id: project?.id,
      text: textToSave,
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
          <h2 className="font-bold text-gray-900">{type === "wish" ? "Quick Wish / Pending" : "Quick Reminder"}</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl p-3 border border-red-200">{error}</p>}

          {/* Phase Selector (Only for Wish List) */}
          {type === "wish" && (
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Phase (optional)</label>
              <select
                value={form.phase_id}
                onChange={(e) => setForm((p) => ({ ...p, phase_id: e.target.value }))}
                className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-955 font-semibold focus:border-gray-500 focus:outline-none"
              >
                <option value="">No phase selected</option>
                {phases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              {type === "wish" ? "What is your wish / pending work? *" : "Reminder / Task *"}
            </label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs resize-none focus:border-gray-500 focus:outline-none bg-white text-gray-900 font-medium"
              rows={3}
              placeholder={type === "wish" ? "e.g. Build modular barbecue deck in lawn..." : "e.g. Call Ravi about steel delivery..."}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              {type === "wish" ? "Target Date (optional)" : "Due Date (optional)"}
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              className="w-full h-11 border border-border rounded-xl px-3 text-xs font-sans font-semibold bg-white text-gray-900 focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 border border-border text-gray-900 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.text}
              className="flex-1 h-11 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : "Save"}
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
                <Dialog.Title className="text-xl font-bold leading-none tracking-tight text-gray-900">Quick Add</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-2">
                  What would you like to log today?
                </Dialog.Description>
              </div>
              <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
                <button
                  onClick={() => setScreen("log")}
                  className="flex items-center gap-4 bg-blue-50/20 hover:bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-left transition-colors"
                >
                  <div className="bg-blue-100 p-3 rounded-full"><PencilLine className="h-6 w-6 text-blue-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Add Works Completed</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Log daily progress with photos</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("expense")}
                  className="flex items-center gap-4 bg-emerald-50/20 hover:bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-left transition-colors"
                >
                  <div className="bg-emerald-100 p-3 rounded-full"><Receipt className="h-6 w-6 text-emerald-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Add Expense / Receipt</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Record a payment with optional receipt</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("funds")}
                  className="flex items-center gap-4 bg-orange-50/20 hover:bg-orange-50/60 p-4 rounded-xl border border-orange-100 text-left transition-colors"
                >
                  <div className="bg-orange-100 p-3 rounded-full"><Landmark className="h-6 w-6 text-orange-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Add Funds</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Record capital received for the project</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("reminder")}
                  className="flex items-center gap-4 bg-purple-50/20 hover:bg-purple-50/60 p-4 rounded-xl border border-purple-100 text-left transition-colors"
                >
                  <div className="bg-purple-100 p-3 rounded-full"><Bell className="h-6 w-6 text-purple-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Reminder / Followup</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Set a reminder or calendar followup task</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("wish")}
                  className="flex items-center gap-4 bg-rose-50/20 hover:bg-rose-50/60 p-4 rounded-xl border border-rose-100 text-left transition-colors"
                >
                  <div className="bg-rose-100 p-3 rounded-full"><Sparkles className="h-6 w-6 text-rose-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Wishlist / Pending Work</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Add backlog items or project backlog desires</p>
                  </div>
                </button>
                <button
                  onClick={() => setScreen("note")}
                  className="flex items-center gap-4 bg-amber-50/20 hover:bg-amber-50/60 p-4 rounded-xl border border-amber-100 text-left transition-colors"
                >
                  <div className="bg-amber-100 p-3 rounded-full"><PenSquare className="h-6 w-6 text-amber-700" /></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">Project Jotting / Note</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Quickly jot down design thoughts or notes</p>
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
          {screen === "reminder" && <QuickReminderForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} initialType="reminder" />}
          {screen === "wish" && <QuickReminderForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} initialType="wish" />}
          {screen === "note" && <QuickNoteForm onClose={handleClose} onSaved={() => { handleClose(); window.location.reload(); }} />}
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
