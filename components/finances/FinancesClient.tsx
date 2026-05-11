"use client";

import { useState, useMemo, useEffect } from "react";
import { BudgetItem, Income } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, PencilLine, Download, Plus, Landmark, ArrowDownToLine, X, Loader2, DollarSign, Wallet } from "lucide-react";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";

interface FinancesClientProps {
  initialItems: BudgetItem[];
  totalBudget: number;
  initialIncomes: Income[];
}

export function FinancesClient({ initialItems, totalBudget, initialIncomes }: FinancesClientProps) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  
  // Accordion sections collapse state
  const [fundsExpanded, setFundsExpanded] = useState(false);
  const [budgetExpanded, setBudgetExpanded] = useState(true);
  const [budgetExpandedCat, setBudgetExpandedCat] = useState<string | null>(null);
  
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  
  // Add Funds form state
  const [showFundsForm, setShowFundsForm] = useState(false);
  const [savingFunds, setSavingFunds] = useState(false);
  const [fundsError, setFundsError] = useState("");
  const [fundsForm, setFundsForm] = useState({
    source: "",
    amount: "",
    date_received: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const spent = useMemo(() => items.reduce((s, i) => s + (i.actual_cost ?? 0), 0), [items]);
  const totalFunds = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const cashBalance = totalFunds - spent;
  const remainingBudget = totalBudget - spent;

  const grouped = useMemo(() => {
    return items.reduce<Record<string, BudgetItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [items]);

  const categories = useMemo(() => Object.keys(grouped), [grouped]);
  const filteredCategories = filterCat === "all" ? categories : [filterCat];

  // Subscribe to real-time additions (useful for QuickAdd write-backs!)
  useEffect(() => {
    const budgetChannel = supabase
      .channel("finances_budget_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_items" }, async () => {
        const { data } = await supabase.from("budget_items").select("*").order("category");
        if (data) setItems(data as BudgetItem[]);
      })
      .subscribe();

    const incomeChannel = supabase
      .channel("finances_income")
      .on("postgres_changes", { event: "*", schema: "public", table: "income" }, async () => {
        const { data } = await supabase.from("income").select("*").order("date_received", { ascending: false });
        if (data) setIncomes(data as Income[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(incomeChannel);
    };
  }, []);

  function handleExport() {
    const rows: string[] = [];
    rows.push("Type,Category/Source,Item,Quoted/Received (₹),Actual (₹),Status,Date,Notes");
    for (const i of items) {
      rows.push([
        "Expense",
        i.category,
        i.item_name,
        i.quoted_cost ?? "",
        i.actual_cost ?? "",
        i.status ?? "",
        i.payment_date ?? "",
        (i.notes ?? "").replace(/,/g, " "),
      ].join(","));
    }
    rows.push("");
    for (const inc of incomes) {
      rows.push([
        "Funds Received",
        inc.source,
        "",
        inc.amount,
        "",
        "Received",
        inc.date_received ?? "",
        (inc.notes ?? "").replace(/,/g, " "),
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vasudha-finances-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddFunds() {
    if (!fundsForm.source || !fundsForm.amount) {
      setFundsError("Source and amount are required.");
      return;
    }
    setSavingFunds(true);
    setFundsError("");

    const { data: project } = await supabase.from("projects").select("id").single();
    const { data, error: insertError } = await supabase
      .from("income")
      .insert({
        project_id: project?.id,
        source: fundsForm.source,
        amount: Number(fundsForm.amount),
        date_received: fundsForm.date_received,
        notes: fundsForm.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      setFundsError("Failed to save. Try again.");
    } else if (data) {
      setIncomes((prev) => [data as Income, ...prev]);
      setShowFundsForm(false);
      setFundsForm({ source: "", amount: "", date_received: new Date().toISOString().split("T")[0], notes: "" });
    }
    setSavingFunds(false);
  }

  return (
    <>
      {editingItem && (
        <ExpenseForm
          prefillItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            const { data } = await supabase.from("budget_items").select("*").order("category");
            if (data) setItems(data as BudgetItem[]);
            setEditingItem(null);
          }}
        />
      )}

      <div className="space-y-4">
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Financial Hub</h2>
            <p className="text-sm text-muted-foreground">{items.length} budget items · {incomes.length} funds logs</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Premium Dashboard Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-border shadow-sm space-y-1">
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Total Project Budget</p>
            <p className="text-lg font-extrabold text-gray-900 font-sans">{formatINR(totalBudget)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 shadow-sm space-y-1">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Funds Received</p>
            <p className="text-lg font-extrabold text-emerald-800 font-sans">{formatINR(totalFunds)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 shadow-sm space-y-1">
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Total Spent</p>
            <p className="text-lg font-extrabold text-orange-800 font-sans">{formatINR(spent)}</p>
          </div>
          <div className={`rounded-xl p-3 shadow-sm border space-y-1 ${cashBalance >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${cashBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>Net Cash In Hand</p>
            <p className={`text-lg font-extrabold font-sans ${cashBalance >= 0 ? "text-blue-800" : "text-red-800"}`}>{formatINR(cashBalance)}</p>
          </div>
        </div>

        {/* Unified Progress Slider */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-semibold">
            <span>Spent of Capital: {totalFunds > 0 ? Math.round((spent / totalFunds) * 100) : 0}%</span>
            <span>Spent of Budget: {totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all ${spent > totalFunds ? "bg-red-500 animate-pulse" : "bg-orange-500"}`}
              style={{ width: `${Math.min(100, totalFunds > 0 ? (spent / totalFunds) * 100 : 0)}%` }}
            />
          </div>
          {spent > totalFunds && (
            <p className="text-[10px] font-semibold text-red-600">🚨 Spent exceeds received funds by {formatINR(spent - totalFunds)}</p>
          )}
        </div>

        {/* SECTION 1: Collapsible Funds Received Section */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setFundsExpanded(!fundsExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Landmark className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Funds & Capital Logs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatINR(totalFunds)} received across {incomes.length} deposits
                </p>
              </div>
            </div>
            {fundsExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {fundsExpanded && (
            <div className="border-t border-border bg-gray-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Receipt Registry</span>
                <button
                  onClick={() => setShowFundsForm(true)}
                  className="flex items-center gap-1 h-8 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Capital
                </button>
              </div>

              {incomes.length === 0 ? (
                <div className="text-center py-6 bg-white border border-dashed border-border rounded-lg">
                  <p className="text-xs font-semibold text-gray-700">No funds logged yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Log bank loans or self capital here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {incomes.map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border shadow-sm gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{inc.source}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(inc.date_received)}</p>
                        {inc.notes && <p className="text-[10px] text-gray-500 mt-1 italic truncate">{inc.notes}</p>}
                      </div>
                      <p className="text-xs font-extrabold text-emerald-700 font-sans shrink-0">{formatINR(inc.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: Collapsible Budget Categories Section */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setBudgetExpanded(!budgetExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Budget & Expenses</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Spent {formatINR(spent)} of {formatINR(totalBudget)} across {categories.length} segments
                </p>
              </div>
            </div>
            {budgetExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {budgetExpanded && (
            <div className="border-t border-border bg-gray-50/30 p-4 space-y-3">
              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["all", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                      filterCat === cat ? "bg-gray-900 text-white shadow-sm" : "bg-white text-gray-600 border border-border hover:bg-gray-50"
                    }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>

              {/* Accordions list */}
              <div className="space-y-2.5">
                {filteredCategories.map((cat) => {
                  const catItems = grouped[cat];
                  const catQuoted = catItems.reduce((s, i) => s + (i.quoted_cost ?? 0), 0);
                  const catActual = catItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
                  const isOpen = budgetExpandedCat === cat;

                  return (
                    <div key={cat} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden transition-all">
                      <button
                        onClick={() => setBudgetExpandedCat(isOpen ? null : cat)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/30 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">{cat}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatINR(catQuoted)} target · {catActual > 0 ? formatINR(catActual) + " paid" : "No actuals yet"}
                          </p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4.5 w-4.5 text-gray-400" /> : <ChevronDown className="h-4.5 w-4.5 text-gray-400" />}
                      </button>

                      {isOpen && (
                        <div className="border-t border-border divide-y divide-border bg-gray-50/10">
                          {catItems.map((item) => {
                            const variance = (item.actual_cost ?? 0) - (item.quoted_cost ?? 0);
                            return (
                              <div key={item.id} className="px-4 py-3.5 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-xs font-semibold text-gray-800 flex-1 leading-normal">{item.item_name}</p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {item.status && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                                        {item.status}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => setEditingItem(item)}
                                      className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors active:scale-95"
                                      title="Log Actual"
                                    >
                                      <PencilLine className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-gray-50">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Target</p>
                                    <p className="font-semibold text-gray-800 font-sans mt-0.5">{formatINR(item.quoted_cost)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Paid Actual</p>
                                    <p className="font-semibold text-gray-800 font-sans mt-0.5">{item.actual_cost ? formatINR(item.actual_cost) : "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Variance</p>
                                    <p className={`font-semibold font-sans mt-0.5 ${variance > 0 ? "text-red-600" : variance < 0 ? "text-emerald-600" : "text-gray-600"}`}>
                                      {item.actual_cost ? (variance > 0 ? "+" : "") + formatINR(variance) : "—"}
                                    </p>
                                  </div>
                                </div>
                                {item.notes && (
                                  <p className="text-[10px] text-gray-500 bg-gray-50 rounded p-1.5 mt-1 border border-gray-100/50 break-all whitespace-normal">
                                    📝 {item.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Modal Form to Add Capital Funds */}
      {showFundsForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Record Received Funds</h2>
              <button onClick={() => setShowFundsForm(false)} className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {fundsError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{fundsError}</p>}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Source / Description *</label>
                <input
                  type="text"
                  value={fundsForm.source}
                  onChange={(e) => setFundsForm((p) => ({ ...p, source: e.target.value }))}
                  className="w-full h-12 border border-border rounded-lg px-3 text-sm focus:border-gray-500 focus:outline-none"
                  placeholder="e.g. Bank Loan, Personal Savings, Family support"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={fundsForm.amount}
                    onChange={(e) => setFundsForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full h-12 border border-border rounded-lg px-3 text-sm focus:border-gray-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Date Received</label>
                  <input
                    type="date"
                    value={fundsForm.date_received}
                    onChange={(e) => setFundsForm((p) => ({ ...p, date_received: e.target.value }))}
                    className="w-full h-12 border border-border rounded-lg px-3 text-sm focus:border-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Notes</label>
                <textarea
                  value={fundsForm.notes}
                  onChange={(e) => setFundsForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-3 text-sm resize-none focus:border-gray-500 focus:outline-none"
                  rows={2}
                  placeholder="Optional additional notes..."
                />
              </div>
              <button
                onClick={handleAddFunds}
                disabled={savingFunds}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {savingFunds ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Record Funds"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
