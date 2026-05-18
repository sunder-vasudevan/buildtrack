"use client";

import { useState, useMemo, useEffect } from "react";
import { BudgetItem, Income, Expense } from "@/lib/types";
import { formatINR, formatDate, parseDeliverableFromNotes, cleanDeliverableNotes } from "@/lib/utils";
import { ChevronDown, ChevronUp, PencilLine, Download, Plus, Landmark, ArrowDownToLine, X, Loader2, DollarSign, Wallet, Trash2, Search, Link2 } from "lucide-react";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";

interface FinancesClientProps {
  initialItems: BudgetItem[];
  totalBudget: number;
  initialIncomes: Income[];
  initialExpenses?: Expense[];
  phases?: any[];
}

export function FinancesClient({ initialItems, totalBudget, initialIncomes, initialExpenses = [], phases = [] }: FinancesClientProps) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [expensesExpanded, setExpensesExpanded] = useState(true);
  // inline link state: expenseId -> form
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ phase_id: "", deliverable_name: "", new_deliverable: "", budget_item_id: "", new_budget_item: "", new_budget_item_name: "" });
  const [linkingPhaseDeliverables, setLinkingPhaseDeliverables] = useState<{ name: string }[]>([]);
  const [linkingPhaseBudgetItems, setLinkingPhaseBudgetItems] = useState<BudgetItem[]>([]);
  const [savingLink, setSavingLink] = useState(false);
  
  // Accordion sections collapse state
  const [fundsExpanded, setFundsExpanded] = useState(false);
  const [budgetExpanded, setBudgetExpanded] = useState(true);
  const [budgetExpandedCat, setBudgetExpandedCat] = useState<string | null>(null);
  
  const [filterCat, setFilterCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
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

  // spent = budget_items actual_cost + unlinked expenses (linked ones already reflected in budget_items.actual_cost)
  const unlinkedExpenses = useMemo(() => expenses.filter((e) => !e.budget_item_id), [expenses]);
  const spent = useMemo(
    () => items.reduce((s, i) => s + (i.actual_cost ?? 0), 0) + unlinkedExpenses.reduce((s, e) => s + e.amount, 0),
    [items, unlinkedExpenses]
  );
  const totalFunds = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const cashBalance = totalFunds - spent;
  const remainingBudget = totalBudget - spent;

  const searchQueryLower = searchQuery.toLowerCase().trim();

  const filteredItems = useMemo(() => {
    if (!searchQueryLower) return items;
    return items.filter((item) => {
      const name = (item.item_name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();
      return name.includes(searchQueryLower) || cat.includes(searchQueryLower) || notes.includes(searchQueryLower);
    });
  }, [items, searchQueryLower]);

  const grouped = useMemo(() => {
    const res = filteredItems.reduce<Record<string, BudgetItem[]>>((acc, item) => {
      let cat = item.category || "Other";
      if (cat === "Vendor Quotes" || cat === "Additional Items") {
        cat = "Estimates";
      }
      if (cat === "Other" || cat === "Others") {
        cat = "Misc/Unplanned";
      }
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {});

    // For "Estimates", sort phase-wise:
    if (res["Estimates"]) {
      res["Estimates"].sort((a, b) => {
        const indexA = phases.findIndex((p) => p.id === a.phase_id);
        const indexB = phases.findIndex((p) => p.id === b.phase_id);
        
        const numA = indexA !== -1 ? indexA : 99999;
        const numB = indexB !== -1 ? indexB : 99999;
        
        if (numA !== numB) {
          return numA - numB;
        }
        return (a.item_name || "").localeCompare(b.item_name || "");
      });
    }

    return res;
  }, [filteredItems, phases]);

  const categories = useMemo(() => Object.keys(grouped), [grouped]);
  const filteredCategories = filterCat === "all" ? categories : [filterCat];

  // Subscribe to real-time additions (useful for QuickAdd write-backs!)
  useEffect(() => {
    const budgetChannel = supabase
      .channel("finances_budget_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_items" }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from("budget_items").select("*").eq("user_id", user!.id).order("category");
        if (data) setItems(data as BudgetItem[]);
      })
      .subscribe();

    const incomeChannel = supabase
      .channel("finances_income")
      .on("postgres_changes", { event: "*", schema: "public", table: "income" }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from("income").select("*").eq("user_id", user!.id).order("date_received", { ascending: false });
        if (data) setIncomes(data as Income[]);
      })
      .subscribe();

    const expensesChannel = supabase
      .channel("finances_expenses")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from("expenses").select("*").eq("user_id", user!.id).order("expense_date", { ascending: false });
        if (data) setExpenses(data as Expense[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(incomeChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, []);

  // Proactive automatic phase linking for unlinked quotes/expenses
  useEffect(() => {
    if (items.length === 0 || phases.length === 0) return;

    const unlinkedItems = items.filter((item) => !item.phase_id);
    if (unlinkedItems.length === 0) return;

    async function performAutoLink() {
      const updates: { id: string; phase_id: string }[] = [];

      for (const item of unlinkedItems) {
        const text = `${item.item_name || ""} ${item.category || ""} ${item.notes || ""}`.toLowerCase();
        let matchedPhaseId: string | null = null;

        // 1. Direct match with phase names or deliverable text
        for (const phase of phases) {
          const deliverables = phase.deliverables || [];
          const hasDirectMatch = deliverables.some((d: any) => {
            const delName = (typeof d === "string" ? d : d.name || "").toLowerCase();
            return text.includes(delName) || delName.includes(text);
          });

          if (hasDirectMatch) {
            matchedPhaseId = phase.id;
            break;
          }
        }

        // 2. Fallback to advanced construction keyword mapping
        if (!matchedPhaseId) {
          const keywords = [
            { key: "excavation", num: 0 },
            { key: "jcb", num: 0 },
            { key: "foundation", num: 0 },
            { key: "footing", num: 0 },
            { key: "meter", num: 0 },
            { key: "pcc", num: 1 },
            { key: "rebar", num: 1 },
            { key: "column", num: 1 },
            { key: "plinth", num: 1 },
            { key: "concrete", num: 1 },
            { key: "brickwork", num: 2 },
            { key: "walls", num: 2 },
            { key: "chowkat", num: 2 },
            { key: "chowkats", num: 2 },
            { key: "lintel", num: 2 },
            { key: "door", num: 2 },
            { key: "window", num: 2 },
            { key: "centering", num: 3 },
            { key: "roof", num: 3 },
            { key: "slab", num: 3 },
            { key: "weatherproof", num: 3 },
            { key: "plastering", num: 4 },
            { key: "plaster", num: 4 },
            { key: "waterproofing", num: 4 },
            { key: "putty", num: 4 },
            { key: "electrical", num: 5 },
            { key: "wiring", num: 5 },
            { key: "conduit", num: 5 },
            { key: "plumbing", num: 5 },
            { key: "drainage", num: 5 },
            { key: "septic", num: 5 },
            { key: "borewell", num: 5 },
            { key: "sewage", num: 5 },
            { key: "copper piping", num: 5 },
            { key: "flooring", num: 6 },
            { key: "granite", num: 6 },
            { key: "woodwork", num: 6 },
            { key: "wardrobes", num: 6 },
            { key: "gate", num: 6 },
            { key: "grille", num: 6 },
            { key: "grilles", num: 6 },
            { key: "paint", num: 6 },
            { key: "safety", num: 7 },
            { key: "fence", num: 7 },
            { key: "pump", num: 7 },
            { key: "tank", num: 7 },
            { key: "solar", num: 7 },
            { key: "inverter", num: 7 },
            { key: "generator", num: 7 },
            { key: "cleanup", num: 7 }
          ];

          for (const kw of keywords) {
            if (text.includes(kw.key)) {
              const targetPh = phases[kw.num] || phases.find((p, idx) => idx === kw.num);
              if (targetPh) {
                matchedPhaseId = targetPh.id;
                break;
              }
            }
          }
        }

        if (matchedPhaseId) {
          updates.push({ id: item.id, phase_id: matchedPhaseId });
        }
      }

      if (updates.length > 0) {
        await Promise.all(
          updates.map((up) =>
            supabase
              .from("budget_items")
              .update({ phase_id: up.phase_id })
              .eq("id", up.id)
          )
        );
      }
    }

    performAutoLink();
  }, [items, phases]);

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

    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();
    const { data, error: insertError } = await supabase
      .from("income")
      .insert({
        project_id: project?.id,
        user_id: user!.id,
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

  async function handleDeleteExpense(item: BudgetItem) {
    const isCustom = !item.quoted_cost;
    const confirmMessage = isCustom
      ? `Are you sure you want to permanently delete the custom expense "${item.item_name}"?`
      : `Are you sure you want to reset/delete the logged payment of ${formatINR(item.actual_cost || 0)} for "${item.item_name}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (isCustom) {
        const { error } = await supabase.from("budget_items").delete().eq("id", item.id);
        if (error) throw error;
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        const { error } = await supabase
          .from("budget_items")
          .update({
            actual_cost: null,
            payment_date: null,
            status: "Approved",
            notes: null,
            receipt_url: null,
          })
          .eq("id", item.id);
        if (error) throw error;

        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from("budget_items").select("*").eq("user_id", user!.id).order("category");
        if (data) setItems(data as BudgetItem[]);
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete. Please try again.");
    }
  }

  async function handleDeleteExpenseRow(exp: Expense) {
    if (!window.confirm(`Delete expense of ${formatINR(exp.amount)}?`)) return;
    const { error } = await supabase.from("expenses").delete().eq("id", exp.id);
    if (!error) setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
  }

  async function startLinking(exp: Expense) {
    setLinkingId(exp.id);
    setLinkForm({ phase_id: exp.phase_id ?? "", deliverable_name: exp.deliverable_name ?? "", new_deliverable: "", budget_item_id: exp.budget_item_id ?? "", new_budget_item: "", new_budget_item_name: "" });
    if (exp.phase_id) {
      const ph = phases.find((p: any) => p.id === exp.phase_id);
      setLinkingPhaseDeliverables(ph?.deliverables ?? []);
      const { data } = await supabase.from("budget_items").select("*").eq("phase_id", exp.phase_id);
      setLinkingPhaseBudgetItems((data ?? []) as BudgetItem[]);
    } else {
      setLinkingPhaseDeliverables([]);
      setLinkingPhaseBudgetItems([]);
    }
  }

  async function handleLinkPhaseChange(phaseId: string) {
    setLinkForm((p) => ({ ...p, phase_id: phaseId, deliverable_name: "", new_deliverable: "", budget_item_id: "", new_budget_item: "", new_budget_item_name: "" }));
    if (phaseId) {
      const ph = phases.find((p: any) => p.id === phaseId);
      setLinkingPhaseDeliverables(ph?.deliverables ?? []);
      const { data } = await supabase.from("budget_items").select("*").eq("phase_id", phaseId);
      setLinkingPhaseBudgetItems((data ?? []) as BudgetItem[]);
    } else {
      setLinkingPhaseDeliverables([]);
      setLinkingPhaseBudgetItems([]);
    }
  }

  async function handleSaveLink(exp: Expense) {
    setSavingLink(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: project } = await supabase.from("projects").select("id").eq("user_id", user!.id).single();

    let finalDeliverable = linkForm.deliverable_name;
    if (linkForm.deliverable_name === "__new__") {
      finalDeliverable = linkForm.new_deliverable.trim();
      // append to phase deliverables JSONB
      if (linkForm.phase_id && finalDeliverable) {
        const ph = phases.find((p: any) => p.id === linkForm.phase_id);
        if (ph) {
          const existing = ph.deliverables ?? [];
          await supabase.from("phases").update({ deliverables: [...existing, { name: finalDeliverable }] }).eq("id", linkForm.phase_id);
        }
      }
    }

    let finalBudgetItemId = linkForm.budget_item_id === "__new__" ? null : (linkForm.budget_item_id || null);
    if (linkForm.budget_item_id === "__new__" && linkForm.new_budget_item_name.trim()) {
      const { data: newItem } = await supabase.from("budget_items").insert({
        user_id: user!.id,
        project_id: project?.id,
        item_name: linkForm.new_budget_item_name.trim(),
        category: exp.category,
        phase_id: linkForm.phase_id || null,
        actual_cost: exp.amount,
        status: "Paid",
      }).select().single();
      if (newItem) finalBudgetItemId = newItem.id;
    } else if (finalBudgetItemId) {
      const existing = items.find((i) => i.id === finalBudgetItemId);
      await supabase.from("budget_items").update({ actual_cost: (existing?.actual_cost ?? 0) + exp.amount }).eq("id", finalBudgetItemId);
    }

    await supabase.from("expenses").update({
      phase_id: linkForm.phase_id || null,
      deliverable_name: finalDeliverable || null,
      budget_item_id: finalBudgetItemId,
    }).eq("id", exp.id);

    // refresh
    const { data: updatedExp } = await supabase.from("expenses").select("*").eq("user_id", user!.id).order("expense_date", { ascending: false });
    if (updatedExp) setExpenses(updatedExp as Expense[]);
    const { data: updatedItems } = await supabase.from("budget_items").select("*").eq("user_id", user!.id).order("category");
    if (updatedItems) setItems(updatedItems as BudgetItem[]);

    setLinkingId(null);
    setSavingLink(false);
  }

  async function handleDeleteIncome(income: Income) {
    if (!window.confirm(`Are you sure you want to delete this deposit of ${formatINR(income.amount)} from "${income.source}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("income").delete().eq("id", income.id);
      if (error) throw error;
      setIncomes((prev) => prev.filter((i) => i.id !== income.id));
    } catch (err) {
      console.error("Error deleting income log:", err);
      alert("Failed to delete deposit. Please try again.");
    }
  }

  return (
    <>
      {editingItem && (
        <ExpenseForm
          prefillItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from("budget_items").select("*").eq("user_id", user!.id).order("category");
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
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <span className="text-4xl">💰</span>
                  <p className="font-semibold text-gray-700">No funds recorded yet</p>
                  <p className="text-sm text-gray-400">Tap + to record funds received</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {incomes.map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border shadow-sm gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{inc.source}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(inc.date_received)}</p>
                        {inc.notes && <p className="text-[10px] text-gray-500 mt-1 italic truncate">{inc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs font-extrabold text-emerald-700 font-sans">{formatINR(inc.amount)}</p>
                        <button
                          onClick={() => handleDeleteIncome(inc)}
                          className="p-1.5 rounded-lg border border-red-100 bg-white hover:bg-red-50 text-red-500 transition-colors active:scale-95"
                          title="Delete capital log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
            <div className="border-t border-border bg-gray-50/30 p-4 space-y-3.5">
              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quotes, items, categories, or notes..."
                  className="w-full h-11 pl-10 pr-16 border border-border rounded-xl text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none placeholder:text-gray-400"
                />
                <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>

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
                {Object.keys(grouped).length === 0 ? (
                  items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <span className="text-4xl">🧱</span>
                      <p className="font-semibold text-gray-700">No expenses yet</p>
                      <p className="text-sm text-gray-400">Tap + to log your first payment</p>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-white rounded-xl border border-border/50 shadow-xs">
                      <p className="text-xs text-muted-foreground font-semibold">No matching budget items, vendor quotes, or expenses found. 🔍</p>
                    </div>
                  )
                ) : (
                  filteredCategories.map((cat) => {
                    const catItems = grouped[cat];
                    if (!catItems || catItems.length === 0) return null;
                    const catQuoted = catItems.reduce((s, i) => s + (i.quoted_cost ?? 0), 0);
                    const catActual = catItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
                  const isOpen = budgetExpandedCat === cat || searchQueryLower !== "";

                  return (
                    <div key={cat} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden transition-all">
                      <button
                        onClick={() => setBudgetExpandedCat(isOpen ? null : cat)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/30 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">{cat}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatINR(catQuoted)} estimate · {catActual > 0 ? formatINR(catActual) + " paid" : "No actuals yet"}
                          </p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4.5 w-4.5 text-gray-400" /> : <ChevronDown className="h-4.5 w-4.5 text-gray-400" />}
                      </button>

                      {isOpen && (
                        <div className="border-t border-border divide-y divide-border bg-gray-50/10">
                          {catItems.map((item) => {
                            const variance = (item.actual_cost ?? 0) - (item.quoted_cost ?? 0);
                            const linkedPhase = phases.find((p) => p.id === item.phase_id);
                            const linkedDel = parseDeliverableFromNotes(item.notes);
                            const cleanNotes = cleanDeliverableNotes(item.notes);

                            return (
                              <div key={item.id} className="px-4 py-3.5 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-800 leading-normal">{item.item_name}</p>
                                    {!linkedPhase ? (
                                      <div className="flex items-center gap-2 mt-2 p-1.5 bg-amber-50/60 rounded-lg border border-amber-100/60 max-w-sm">
                                        <span className="text-[9px] font-bold text-amber-800 shrink-0">
                                          ⚠️ Unlinked
                                        </span>
                                        <select
                                          defaultValue=""
                                          onChange={async (e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            try {
                                              const { error } = await supabase
                                                .from("budget_items")
                                                .update({ phase_id: val })
                                                .eq("id", item.id);
                                              if (error) throw error;
                                            } catch (err) {
                                              console.error("Error linking phase:", err);
                                              alert("Failed to link phase.");
                                            }
                                          }}
                                          className="flex-1 h-6 bg-white border border-amber-200 text-amber-900 rounded px-1.5 text-[9px] font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                                        >
                                          <option value="">Quick link phase...</option>
                                          {phases.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              🧱 {p.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100/50 leading-none">
                                          🧱 {linkedPhase.name}
                                        </span>
                                        {linkedDel && (
                                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-100/50 leading-none">
                                            🎯 {linkedDel}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
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
                                    {(item.actual_cost !== null || !item.quoted_cost) && (
                                      <button
                                        onClick={() => handleDeleteExpense(item)}
                                        className="p-1.5 rounded-lg border border-red-100 bg-white hover:bg-red-50 text-red-500 transition-colors active:scale-95"
                                        title={!item.quoted_cost ? "Delete custom item" : "Reset/delete payment"}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-gray-50">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Estimate</p>
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
                                {cleanNotes && (
                                  <p className="text-[10px] text-gray-500 bg-gray-50 rounded p-1.5 mt-1 border border-gray-100/50 break-all whitespace-normal">
                                    📝 {cleanNotes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Unplanned Expenses */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setExpensesExpanded(!expensesExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Unplanned Expenses</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unlinkedExpenses.length} unlinked · {formatINR(unlinkedExpenses.reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>
            </div>
            {expensesExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {expensesExpanded && (
            <div className="border-t border-border bg-gray-50/30 p-4 space-y-3">
              {unlinkedExpenses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="text-3xl">🧾</span>
                  <p className="font-semibold text-gray-700 text-sm">No unlinked expenses</p>
                  <p className="text-xs text-gray-400">Use Quick Add → Add Expense to capture payments fast</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unlinkedExpenses.map((exp) => {
                    const linkedPhase = phases.find((p: any) => p.id === exp.phase_id);
                    const isLinking = linkingId === exp.id;
                    return (
                      <div key={exp.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="px-4 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-gray-900 font-sans">{formatINR(exp.amount)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{exp.category}</span>
                              {linkedPhase && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">🧱 {linkedPhase.name}</span>}
                            </div>
                            {exp.description && <p className="text-xs text-gray-600 mt-1 truncate">{exp.description}</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(exp.expense_date)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => isLinking ? setLinkingId(null) : startLinking(exp)}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors active:scale-95"
                            >
                              <Link2 className="h-3 w-3" /> {isLinking ? "Cancel" : "Link"}
                            </button>
                            <button
                              onClick={() => handleDeleteExpenseRow(exp)}
                              className="p-1.5 rounded-lg border border-red-100 bg-white hover:bg-red-50 text-red-500 transition-colors active:scale-95"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {isLinking && (
                          <div className="border-t border-border bg-amber-50/30 p-3 space-y-3">
                            <p className="text-[11px] font-bold text-amber-800">Link this expense to a phase, deliverable, or budget item</p>
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-gray-600 block mb-1">Phase</label>
                                <select
                                  value={linkForm.phase_id}
                                  onChange={(e) => handleLinkPhaseChange(e.target.value)}
                                  className="w-full h-9 border border-border rounded-lg px-2 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
                                >
                                  <option value="">No phase</option>
                                  {phases.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              {linkForm.phase_id && (
                                <div>
                                  <label className="text-[10px] font-semibold text-gray-600 block mb-1">Deliverable</label>
                                  <select
                                    value={linkForm.deliverable_name}
                                    onChange={(e) => setLinkForm((p) => ({ ...p, deliverable_name: e.target.value, new_deliverable: "" }))}
                                    className="w-full h-9 border border-border rounded-lg px-2 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
                                  >
                                    <option value="">No deliverable</option>
                                    {linkingPhaseDeliverables.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                                    <option value="__new__">＋ New deliverable</option>
                                  </select>
                                  {linkForm.deliverable_name === "__new__" && (
                                    <input
                                      type="text"
                                      value={linkForm.new_deliverable}
                                      onChange={(e) => setLinkForm((p) => ({ ...p, new_deliverable: e.target.value }))}
                                      className="w-full h-9 border border-border rounded-lg px-2 text-xs mt-1.5 focus:outline-none focus:border-gray-400 bg-white"
                                      placeholder="Enter deliverable name..."
                                    />
                                  )}
                                </div>
                              )}
                              {linkForm.phase_id && (
                                <div>
                                  <label className="text-[10px] font-semibold text-gray-600 block mb-1">Budget Item (optional)</label>
                                  <select
                                    value={linkForm.budget_item_id}
                                    onChange={(e) => setLinkForm((p) => ({ ...p, budget_item_id: e.target.value, new_budget_item_name: "" }))}
                                    className="w-full h-9 border border-border rounded-lg px-2 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
                                  >
                                    <option value="">No budget item</option>
                                    {linkingPhaseBudgetItems.map((b) => <option key={b.id} value={b.id}>{b.item_name}</option>)}
                                    <option value="__new__">＋ New budget item</option>
                                  </select>
                                  {linkForm.budget_item_id === "__new__" && (
                                    <input
                                      type="text"
                                      value={linkForm.new_budget_item_name}
                                      onChange={(e) => setLinkForm((p) => ({ ...p, new_budget_item_name: e.target.value }))}
                                      className="w-full h-9 border border-border rounded-lg px-2 text-xs mt-1.5 focus:outline-none focus:border-gray-400 bg-white"
                                      placeholder="Budget item name..."
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleSaveLink(exp)}
                              disabled={savingLink}
                              className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {savingLink ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : "Save Link"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline Modal Form to Add Capital Funds */}
      {showFundsForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
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
