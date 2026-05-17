"use client";

import { useState, useRef } from "react";
import { PlanDocument } from "@/lib/types";
import { FileText, Download, Plus, Image as ImageIcon, X, Loader2, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/upload";

const PLAN_CATEGORIES = ["Floor Plan", "Elevation", "Electrical", "Plumbing", "Structural", "Interior", "Landscape", "Other"];

export function PlansTab({ initialPlans }: { initialPlans: PlanDocument[] }) {
  const [plans, setPlans] = useState<PlanDocument[]>(initialPlans);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", category: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file || !form.title) {
      setError("Title and file are required.");
      return;
    }
    setSaving(true);
    setError("");

    let publicUrl: string;
    try {
      publicUrl = await uploadFile(file);
    } catch {
      setError("Upload failed. Try again.");
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();

    const { data, error: insertError } = await supabase
      .from("documents")
      .insert({
        project_id: project?.id,
        user_id: user!.id,
        title: form.title,
        url: publicUrl,
        category: form.category || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("Saved file but failed to record. Try again.");
    } else if (data) {
      setPlans((prev) => [data as PlanDocument, ...prev]);
      setShowForm(false);
      setForm({ title: "", category: "" });
      setFile(null);
    }
    setSaving(false);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Plans & Specs</h2>
          <p className="text-sm text-muted-foreground">{plans.length} documents</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Upload
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No plans uploaded yet. Tap "Upload" to add blueprints or specs.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
              <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                {plan.url.endsWith(".pdf") ? (
                  <FileText className="h-6 w-6 text-blue-600" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{plan.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{plan.category || "General"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(plan.created_at)}</span>
                </div>
              </div>
              <a href={plan.url} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-lg transition-colors">
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Upload Plan / Document</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  placeholder="e.g. Ground Floor Plan, Elevation - Front"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white"
                >
                  <option value="">Select category</option>
                  {PLAN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">File *</label>
                <label className="flex items-center gap-3 w-full h-12 border-2 border-dashed border-border rounded-lg px-3 cursor-pointer hover:border-gray-400 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {file ? file.name : "Tap to upload image or PDF"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file && (
                  <button onClick={() => setFile(null)} className="text-xs text-red-500 mt-1">Remove</button>
                )}
              </div>
              <button
                onClick={handleUpload}
                disabled={saving}
                className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
