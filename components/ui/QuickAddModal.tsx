"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, PencilLine, Receipt, Landmark, Loader2, Upload, Bell, PenSquare, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/upload";

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from("phases").select("id, name, deliverables").eq("user_id", user!.id).order("phase_number").then(({ data }) => {
        if (data) setPhases(data as Phase[]);
      });
    });
  }, []);

  const selectedPhase = phases.find((p) => p.id === form.phase_id);
  const deliverableOptions = (selectedPhase?.deliverables ?? []).map((d) => typeof d === "string" ? { name: d } : d);

  async function handleSave() {
    if (!form.phase_id || !form.deliverable_name || !form.description) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();

    const uploadedPhotos: { url: string; caption: string }[] = [];
    for (const file of photoFiles) {
      try {
        const url = await uploadFile(file);
        uploadedPhotos.push({ url, caption: "" });
      } catch {}
    }

    const categoryTag = form.category ? `[Category: ${form.category}]` : "";
    const labourTag = (form.category === "Labour" && form.no_of_labour) ? `[Labour: ${form.no_of_labour}]` : "";
    const fullDescription = `${categoryTag}${labourTag} ${form.description}`.trim();

    await supabase.from("daily_logs").insert({
      project_id: project?.id,
      user_id: user!.id,
      log_date: form.log_date,
      phase_id: form.phase_id || null,
      deliverable_name: form.deliverable_name || null,
      description: fullDescription,
      weather: form.weather,
      work_status: form.work_status,
      issues: form.issues || null,
      photos: uploadedPhotos,
    });

    // If logged as Completed, mark the deliverable done in Tracker
    if (form.work_status === "Completed" && form.phase_id && form.deliverable_name) {
      const { data: phase } = await supabase.from("phases").select("id, deliverables").eq("id", form.phase_id).single();
      if (phase?.deliverables) {
        const deliverables = phase.deliverables as any[];
        const updated = deliverables.map((d: any) =>
          (typeof d === "string" ? d === form.deliverable_name : d.name === form.deliverable_name)
            ? { ...(typeof d === "string" ? { name: d } : d), status: "Completed" }
            : d
        );
        await supabase.from("phases").update({ deliverables: updated }).eq("id", form.phase_id);
      }
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-lg">Log Work Done</h2>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"><X className="h-4 w-4" /></button>
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

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !form.phase_id || !form.deliverable_name || !form.description} className="flex-1 h-12 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Log"}
        </button>
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
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project, error: projectErr } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();
    if (projectErr || !project?.id) { console.error("project fetch error:", projectErr); setError("Could not load project. Check Supabase connection."); setSaving(false); return; }
    const { error: insertError } = await supabase.from("income").insert({
      project_id: project?.id,
      user_id: user!.id,
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
    <div className="space-y-4">
      <div className="pb-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-lg">Add Funds</h2>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"><X className="h-4 w-4" /></button>
      </div>

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
          className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-12 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Funds"}
        </button>
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
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();
    const { error: insertError } = await supabase.from("reminders").insert({
      project_id: project?.id,
      user_id: user!.id,
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
      supabase.auth.getUser().then(({ data: { user } }) => {
        supabase.from("phases").select("id, name").eq("user_id", user!.id).order("phase_number").then(({ data }) => {
          if (data) setPhases(data as Phase[]);
        });
      });
    }
  }, [type]);

  async function handleSave() {
    if (!form.text) { setError("Text is required."); return; }
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();

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
      user_id: user!.id,
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
    <div className="space-y-4">
      <div className="pb-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-lg">{type === "wish" ? "Quick Wish / Pending" : "Quick Reminder"}</h2>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"><X className="h-4 w-4" /></button>
      </div>

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
          className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.text}
          className="flex-1 h-12 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save"}
        </button>
      </div>
    </div>
  );
}

type BudgetItem = { id: string; item_name: string; category: string; actual_cost: number | null; quoted_cost: number | null };
type SimplePhase = { id: string; name: string };
const EXPENSE_CATEGORIES = ["Labour", "Material", "Equipment", "Professional Fees", "Permits & Legal", "Misc"] as const;

function QuickExpenseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [phases, setPhases] = useState<SimplePhase[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    item_name: "",
    category: "Labour" as typeof EXPENSE_CATEGORIES[number],
    phase_id: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("budget_items").select("id, item_name, category, actual_cost, quoted_cost")
        .eq("user_id", user.id).order("category")
        .then(({ data }) => { if (data) setBudgetItems(data as BudgetItem[]); });
      supabase.from("phases").select("id, name").eq("user_id", user.id).order("phase_number")
        .then(({ data }) => { if (data) setPhases(data as SimplePhase[]); });
    });
  }, []);

  const filtered = budgetItems.filter((b) =>
    b.item_name.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, BudgetItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] ?? []).push(item);
    return acc;
  }, {});

  const selectedItem = budgetItems.find((b) => b.id === selectedId);

  async function handleSave() {
    if (!form.amount) { setError("Amount is required."); return; }
    if (mode === "existing" && !selectedId) { setError("Select a budget item."); return; }
    if (mode === "new" && !form.item_name) { setError("Item name is required."); return; }
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();

    let receiptUrl: string | null = null;
    if (receiptFile) {
      try { receiptUrl = await uploadFile(receiptFile); } catch {}
    }

    if (mode === "existing") {
      const { error: e } = await supabase.from("budget_items").update({
        actual_cost: Number(form.amount),
        payment_date: form.date,
        notes: form.note || null,
        ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
      }).eq("id", selectedId);
      if (e) { setError(`Failed to save: ${e.message}`); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("budget_items").insert({
        item_name: form.item_name,
        category: form.category,
        phase_id: form.phase_id || null,
        actual_cost: Number(form.amount),
        payment_date: form.date,
        notes: form.note || null,
        receipt_url: receiptUrl,
        user_id: user!.id,
        project_id: project?.id,
        status: "Paid",
      });
      if (e) { setError(`Failed to save: ${e.message}`); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-lg">Add Expense</h2>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"><X className="h-4 w-4" /></button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setMode("existing")}
          className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors ${mode === "existing" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Existing item
        </button>
        <button
          onClick={() => setMode("new")}
          className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors ${mode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          New item
        </button>
      </div>

      {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl p-3 border border-red-200">{error}</p>}

      {mode === "existing" ? (
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Budget Item *</label>
          <div className="relative">
            <input
              type="text"
              value={selectedItem ? selectedItem.item_name : search}
              onChange={(e) => { setSearch(e.target.value); setSelectedId(""); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search budget items..."
              className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
            />
            {showDropdown && (
              <div className="absolute z-10 top-12 left-0 right-0 bg-white border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">{cat}</div>
                    {items.map((item) => (
                      <button key={item.id} className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 transition-colors flex justify-between items-center"
                        onClick={() => { setSelectedId(item.id); setSearch(item.item_name); setShowDropdown(false); }}>
                        <span className="font-semibold text-gray-900">{item.item_name}</span>
                        {item.quoted_cost && <span className="text-gray-400 text-[10px]">₹{item.quoted_cost.toLocaleString()}</span>}
                      </button>
                    ))}
                  </div>
                ))}
                {filtered.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">No items found</p>}
                <button className="w-full text-left px-3 py-2.5 text-xs text-emerald-700 font-semibold border-t border-border hover:bg-emerald-50 transition-colors"
                  onClick={() => { setMode("new"); setShowDropdown(false); setSearch(""); }}>
                  + Add new item
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Item Name *</label>
            <input type="text" value={form.item_name} onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
              className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
              placeholder="e.g. Steel reinforcement bars" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as typeof EXPENSE_CATEGORIES[number] }))}
                className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Phase (optional)</label>
              <select value={form.phase_id} onChange={(e) => setForm((p) => ({ ...p, phase_id: e.target.value }))}
                className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none">
                <option value="">No phase</option>
                {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Amount (₹) *</label>
          <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            className="w-full h-11 border border-border rounded-xl px-3 text-xs font-sans font-bold bg-white text-gray-900 focus:border-gray-500 focus:outline-none"
            placeholder="0" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-full h-11 border border-border rounded-xl px-3 text-xs font-sans font-semibold bg-white text-gray-900 focus:border-gray-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700 block mb-1">Note (optional)</label>
        <input type="text" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-medium focus:border-gray-500 focus:outline-none"
          placeholder="Any details..." />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-700 block mb-1">Receipt / Photo (optional)</label>
        <label className="flex items-center gap-3 w-full h-12 border-2 border-dashed border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/30 rounded-xl px-3.5 cursor-pointer hover:border-emerald-400 transition-colors">
          <Upload className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-xs text-emerald-700 font-semibold truncate">
            {receiptFile ? receiptFile.name : "Tap to attach receipt or photo..."}
          </span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 h-12 border border-border text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 h-12 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Expense"}
        </button>
      </div>
    </div>
  );
}

type QuickAddPrefs = { log: boolean; expense: boolean; funds: boolean; reminder: boolean; wish: boolean; note: boolean };

const DEFAULT_ORDER = ["log", "expense", "funds", "reminder", "wish", "note"];

export function QuickAddModal({ quickAddPrefs, quickAddOrder }: { quickAddPrefs?: QuickAddPrefs; quickAddOrder?: string[] }) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const prefs = quickAddPrefs ?? { log: true, expense: true, funds: true, reminder: true, wish: true, note: true };
  const order = quickAddOrder ?? DEFAULT_ORDER;

  function handleClose() {
    setOpen(false);
    setTimeout(() => setScreen("menu"), 300);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setScreen("menu"); }}>
      <Dialog.Trigger asChild>
        <button className="flex items-center justify-center w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg transform -translate-y-4 hover:scale-105 transition-transform focus:outline-none">
          <Plus className="h-6 w-6" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 sm:bottom-auto left-0 right-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] z-50 flex flex-col w-full sm:w-[90%] max-w-lg gap-4 border bg-background p-5 shadow-lg sm:rounded-xl rounded-t-2xl rounded-b-none sm:rounded-b-xl max-h-[92vh] overflow-y-auto pb-safe">
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
                {order.map((key) => {
                  if (!prefs[key as keyof QuickAddPrefs]) return null;
                  if (key === "log") return (
                    <button key="log" onClick={() => setScreen("log")} className="flex items-center gap-4 bg-blue-50/20 hover:bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-left transition-colors">
                      <div className="bg-blue-100 p-3 rounded-full"><PencilLine className="h-6 w-6 text-blue-700" /></div>
                      <div><h4 className="font-semibold text-gray-900 text-base">Add Works Completed</h4><p className="text-xs text-muted-foreground mt-0.5">Log daily progress with photos</p></div>
                    </button>
                  );
                  if (key === "expense") return (
                    <button key="expense" onClick={() => setScreen("expense")} className="flex items-center gap-4 bg-emerald-50/20 hover:bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-left transition-colors">
                      <div className="bg-emerald-100 p-3 rounded-full"><Receipt className="h-6 w-6 text-emerald-700" /></div>
                      <div><h4 className="font-semibold text-gray-900 text-base">Add Expense / Receipt</h4><p className="text-xs text-muted-foreground mt-0.5">Record a payment with optional receipt</p></div>
                    </button>
                  );
                  if (key === "funds") return (
                    <button key="funds" onClick={() => setScreen("funds")} className="flex items-center gap-4 bg-orange-50/20 hover:bg-orange-50/60 p-4 rounded-xl border border-orange-100 text-left transition-colors">
                      <div className="bg-orange-100 p-3 rounded-full"><Landmark className="h-6 w-6 text-orange-700" /></div>
                      <div><h4 className="font-semibold text-gray-900 text-base">Add Funds</h4><p className="text-xs text-muted-foreground mt-0.5">Record capital received for the project</p></div>
                    </button>
                  );
                  if (key === "reminder") return (
                    <button key="reminder" onClick={() => setScreen("reminder")} className="flex items-center gap-4 bg-purple-50/20 hover:bg-purple-50/60 p-4 rounded-xl border border-purple-100 text-left transition-colors">
                      <div className="bg-purple-100 p-3 rounded-full"><Bell className="h-6 w-6 text-purple-700" /></div>
                      <div><h4 className="font-semibold text-gray-900 text-base">Reminder / Followup</h4><p className="text-xs text-muted-foreground mt-0.5">Set a reminder or calendar followup task</p></div>
                    </button>
                  );
                  if (key === "wish") return (
                    <button key="wish" onClick={() => setScreen("wish")} className="flex items-center gap-4 bg-rose-50/20 hover:bg-rose-50/60 p-4 rounded-xl border border-rose-100 text-left transition-colors">
                      <div className="bg-rose-100 p-3 rounded-full"><Sparkles className="h-6 w-6 text-rose-700" /></div>
                      <div><h4 className="font-semibold text-gray-900 text-base">Wishlist / Pending Work</h4><p className="text-xs text-muted-foreground mt-0.5">Add backlog items or project backlog desires</p></div>
                    </button>
                  );
                  if (key === "note") return (
                    <button key="note" onClick={() => setScreen("note")} className="flex items-center gap-4 bg-amber-50/20 hover:bg-amber-50/60 p-4 rounded-xl border border-amber-100 text-left transition-colors">
                      <div className="bg-amber-100 p-3 rounded-full"><PenSquare className="h-6 w-6 text-amber-700" /></div>
                      <div><h4 className="font-semibold text-gray-900 text-base">Project Jotting / Note</h4><p className="text-xs text-muted-foreground mt-0.5">Quickly jot down design thoughts or notes</p></div>
                    </button>
                  );
                  return null;
                })}
              </div>
              <Dialog.Close asChild>
                <button className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </>
          )}

          {/* Form Screens */}
          {screen === "log" && <QuickLogForm onClose={() => setScreen("menu")} onSaved={() => { handleClose(); window.location.reload(); }} />}
          {screen === "expense" && <QuickExpenseForm onClose={() => setScreen("menu")} onSaved={() => { handleClose(); window.location.reload(); }} />}
          {screen === "funds" && <QuickFundsForm onClose={() => setScreen("menu")} onSaved={() => { handleClose(); window.location.reload(); }} />}
          {screen === "reminder" && <QuickReminderForm onClose={() => setScreen("menu")} onSaved={() => { handleClose(); window.location.reload(); }} initialType="reminder" />}
          {screen === "wish" && <QuickReminderForm onClose={() => setScreen("menu")} onSaved={() => { handleClose(); window.location.reload(); }} initialType="wish" />}
          {screen === "note" && <QuickNoteForm onClose={() => setScreen("menu")} onSaved={() => { handleClose(); window.location.reload(); }} />}
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
