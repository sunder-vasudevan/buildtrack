"use client";

import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BudgetItem } from "@/lib/types";

const CATEGORIES = [
  "Civil Labour", "Steel & TMT", "Cement & Aggregates", "Bricks & Blocks",
  "Roofing", "Windows & Doors", "Electrical (MEP)", "Plumbing (MEP)",
  "Sanitary & Fixtures", "Flooring & Tiles", "Granite & Marble",
  "Painting & Finishing", "Carpentry & Woodwork", "Solar & Energy",
  "Professional Fees", "Hardware & Fasteners", "Other",
];

interface ExpenseFormProps {
  onClose: () => void;
  onSaved: () => void;
  prefillItem?: BudgetItem;
}

export function ExpenseForm({ onClose, onSaved, prefillItem }: ExpenseFormProps) {
  const [form, setForm] = useState({
    item_name: prefillItem?.item_name ?? "",
    category: prefillItem?.category ?? "",
    amount: prefillItem?.actual_cost ? String(prefillItem.actual_cost) : "",
    date: new Date().toISOString().split("T")[0],
    worker_name: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.amount || !form.item_name || !form.category) {
      setError("Item name, category and amount are required.");
      return;
    }
    setSaving(true);
    setError("");

    let receiptUrl: string | null = null;

    // Upload receipt if provided
    if (receiptFile) {
      const ext = receiptFile.name.split(".").pop();
      const path = `receipts/${form.date}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("buildtrack-photos")
        .upload(path, receiptFile, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("buildtrack-photos").getPublicUrl(path);
        receiptUrl = data.publicUrl;
      }
    }

    // Get project id
    const { data: project } = await supabase.from("projects").select("id").single();
    const projectId = project?.id;

    if (prefillItem) {
      // Update existing budget item's actual cost
      await supabase
        .from("budget_items")
        .update({
          actual_cost: Number(form.amount),
          status: "Paid",
          notes: [prefillItem.notes, form.notes, form.worker_name ? `Worker: ${form.worker_name}` : "", receiptUrl ? `Receipt: ${receiptUrl}` : ""].filter(Boolean).join(" | ") || null,
        })
        .eq("id", prefillItem.id);
    } else {
      // Insert new budget item as expense
      await supabase.from("budget_items").insert({
        project_id: projectId,
        item_name: form.item_name,
        category: form.category,
        actual_cost: Number(form.amount),
        status: "Paid",
        payment_date: form.date,
        notes: [form.notes, form.worker_name ? `Worker: ${form.worker_name}` : "", receiptUrl ? `Receipt: ${receiptUrl}` : ""].filter(Boolean).join(" | ") || null,
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {prefillItem ? `Log Actual — ${prefillItem.item_name}` : "Add Expense"}
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

          {!prefillItem && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Item / Description *</label>
                <input
                  type="text"
                  value={form.item_name}
                  onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  placeholder="e.g. Sand delivery, Labour payment"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Amount (₹) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full h-12 border border-border rounded-lg px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Worker / Paid To</label>
            <input
              type="text"
              value={form.worker_name}
              onChange={(e) => setForm((p) => ({ ...p, worker_name: e.target.value }))}
              className="w-full h-12 border border-border rounded-lg px-3 text-sm"
              placeholder="e.g. Ravi, Sai Steel & TMT"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Receipt / Invoice</label>
            <label className="flex items-center gap-3 w-full h-12 border-2 border-dashed border-border rounded-lg px-3 cursor-pointer hover:border-gray-400 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {receiptFile ? receiptFile.name : "Tap to upload photo or PDF"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {receiptFile && (
              <button
                onClick={() => setReceiptFile(null)}
                className="text-xs text-red-500 mt-1"
              >
                Remove
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
