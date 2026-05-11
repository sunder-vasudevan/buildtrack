"use client";

import { useState } from "react";
import { Worker } from "@/lib/types";
import { Phone, Users, Plus, HardHat, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ROLES = ["Mason", "Carpenter", "Electrician", "Plumber", "Painter", "Tile Layer", "Labour", "Supervisor", "Contractor", "Other"];

export function TeamTab({ initialWorkers }: { initialWorkers: Worker[] }) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", role: "", phone: "", skills: "" });

  async function handleSave() {
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");

    const { data: project } = await supabase.from("projects").select("id").single();
    const skills = form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const { data, error: insertError } = await supabase
      .from("workers")
      .insert({
        project_id: project?.id,
        name: form.name,
        role: form.role || null,
        phone: form.phone || null,
        skills: skills.length > 0 ? skills : null,
      })
      .select()
      .single();

    if (insertError) {
      setError("Failed to save. Try again.");
    } else if (data) {
      setWorkers((prev) => [...prev, data as Worker]);
      setShowForm(false);
      setForm({ name: "", role: "", phone: "", skills: "" });
    }
    setSaving(false);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Directory</h2>
          <p className="text-sm text-muted-foreground">{workers.length} team members</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Worker
        </button>
      </div>

      {workers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No workers added yet. Keep your team directory here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <div key={worker.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center flex-shrink-0">
                <HardHat className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base truncate">{worker.name}</h3>
                <p className="text-xs text-muted-foreground">{worker.role || "Worker"}</p>
                {worker.skills && worker.skills.length > 0 && (
                  <div className="flex gap-1 mt-1 overflow-x-auto pb-1">
                    {worker.skills.map((skill, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {worker.phone ? (
                <a href={`tel:${worker.phone}`} className="p-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-full transition-colors flex-shrink-0 shadow-sm border border-green-200">
                  <Phone className="h-5 w-5 fill-current" />
                </a>
              ) : (
                <div className="p-3 bg-gray-50 text-gray-300 rounded-full flex-shrink-0 border border-gray-100">
                  <Phone className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add Worker</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  placeholder="e.g. Ravi Kumar"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white"
                  >
                    <option value="">Select role</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  placeholder="e.g. Brickwork, Plastering, Foundation"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Worker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
