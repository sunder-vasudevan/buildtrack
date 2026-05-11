"use client";

import { useState } from "react";
import { Income } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { Plus, ArrowDownToLine, Landmark, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function IncomeTab({ initialIncome }: { initialIncome: Income[] }) {
  const [incomes, setIncomes] = useState<Income[]>(initialIncome);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    source: "",
    amount: "",
    date_received: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  async function handleSave() {
    if (!form.source || !form.amount) {
      setError("Source and amount are required.");
      return;
    }
    setSaving(true);
    setError("");

    const { data: project } = await supabase.from("projects").select("id").single();
    const { data, error: insertError } = await supabase
      .from("income")
      .insert({
        project_id: project?.id,
        source: form.source,
        amount: Number(form.amount),
        date_received: form.date_received,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("Failed to save. Try again.");
    } else if (data) {
      setIncomes((prev) => [data as Income, ...prev]);
      setShowForm(false);
      setForm({ source: "", amount: "", date_received: new Date().toISOString().split("T")[0], notes: "" });
    }
    setSaving(false);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Funds</h2>
          <p className="text-sm text-muted-foreground">{incomes.length} records</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Funds
        </button>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-sm">
        <p className="text-xs text-emerald-700 font-medium">Total Funds Received</p>
        <p className="text-3xl font-bold text-emerald-800">{formatINR(totalIncome)}</p>
      </div>

      {incomes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <Landmark className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No income recorded yet. Add funds to track your total capital.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incomes.map((income) => (
            <div key={income.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
              <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full flex-shrink-0">
                <ArrowDownToLine className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base truncate">{income.source}</h3>
                <span className="text-xs text-muted-foreground">{formatDate(income.date_received)}</span>
                {income.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{income.notes}</p>}
              </div>
              <p className="font-bold text-emerald-700 flex-shrink-0">{formatINR(income.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Add Funds</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Source / Description *</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  placeholder="e.g. Personal savings, Bank loan, Family"
                />
              </div>
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
                  <label className="text-xs font-medium text-gray-700 block mb-1">Date Received</label>
                  <input
                    type="date"
                    value={form.date_received}
                    onChange={(e) => setForm((p) => ({ ...p, date_received: e.target.value }))}
                    className="w-full h-12 border border-border rounded-lg px-3 text-sm"
                  />
                </div>
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
