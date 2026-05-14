"use client";

import { useState, useMemo, useEffect } from "react";
import { BudgetItem, Income } from "@/lib/types";
import { formatINR, formatDate, parseDeliverableFromNotes, cleanDeliverableNotes, parseQuoteRefFromNotes, cleanQuoteRefNotes, parseReceiptFromNotes, cleanReceiptFromNotes } from "@/lib/utils";
import { ChevronDown, ChevronUp, PencilLine, Download, Plus, Landmark, X, Loader2, Wallet, Trash2, Search, Paperclip } from "lucide-react";
import { ExpenseForm } from "@/components/finances/ExpenseForm";
import { supabase } from "@/lib/supabase";

interface FinancesClientProps {
  initialItems: BudgetItem[];
  totalBudget: number;
  initialIncomes: Income[];
  phases?: any[];
}

export function FinancesClient({ initialItems, totalBudget, initialIncomes, phases = [] }: FinancesClientProps) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  
  // Accordion sections collapse state
  const [fundsExpanded, setFundsExpanded] = useState(false);
  const [budgetExpanded, setBudgetExpanded] = useState(true);
  const [budgetExpandedCat, setBudgetExpandedCat] = useState<string | null>(null);
  
  const [filterCat, setFilterCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [addingExpenseForItem, setAddingExpenseForItem] = useState<BudgetItem | null>(null);
  
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

  const spent = useMemo(() => {
    // Build sets to avoid double-counting: parents with children should not
    // also count their own legacy actual_cost (children are counted separately)
    const parentIdsWithChildren = new Set(
      items
        .map((i) => parseQuoteRefFromNotes(i.notes))
        .filter(Boolean) as string[]
    );
    return items.reduce((s, item) => {
      // Skip the parent's own actual_cost when it has child expenses
      if (!parseQuoteRefFromNotes(item.notes) && parentIdsWithChildren.has(item.id)) return s;
      return s + (item.actual_cost ?? 0);
    }, 0);
  }, [items]);
  const totalFunds = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const cashBalance = totalFunds - spent;
  const remainingBudget = totalBudget - spent;

  const searchQueryLower = searchQuery.toLowerCase().trim();

  // Split items into child expenses (linked to a quote) and top-level items
  const childExpenseMap = useMemo(() => {
    const map: Record<string, BudgetItem[]> = {};
    items.forEach((item) => {
      const parentId = parseQuoteRefFromNotes(item.notes);
      if (parentId) {
        if (!map[parentId]) map[parentId] = [];
        map[parentId].push(item);
      }
    });
    // Sort each parent's children by payment_date ascending
    Object.values(map).forEach((children) =>
      children.sort((a, b) => (a.payment_date ?? "").localeCompare(b.payment_date ?? ""))
    );
    return map;
  }, [items]);

  // Only top-level items (not child expenses) go into the main grouped view
  const topLevelItems = useMemo(
    () => items.filter((item) => !parseQuoteRefFromNotes(item.notes)),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!searchQueryLower) return topLevelItems;
    return topLevelItems.filter((item) => {
      const name = (item.item_name || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();
      return name.includes(searchQueryLower) || cat.includes(searchQueryLower) || notes.includes(searchQueryLower);
    });
  }, [topLevelItems, searchQueryLower]);

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

  async function handleDeleteChildExpense(child: BudgetItem) {
    if (!window.confirm(`Delete this expense of ${formatINR(child.actual_cost || 0)} for "${child.item_name}"?`)) return;
    try {
      const { error } = await supabase.from("budget_items").delete().eq("id", child.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== child.id));
    } catch (err) {
      console.error("Error deleting child expense:", err);
      alert("Failed to delete. Please try again.");
    }
  }

  async function handleDeleteExpense(item: BudgetItem) {
    const children = childExpenseMap[item.id] || [];
    const isCustom = !item.quoted_cost;

    let confirmMessage: string;
    if (children.length > 0) {
      confirmMessage = `Delete "${item.item_name}" and its ${children.length} expense${children.length > 1 ? "s" : ""}? This cannot be undone.`;
    } else if (isCustom) {
      confirmMessage = `Permanently delete the custom expense "${item.item_name}"?`;
    } else {
      confirmMessage = `Reset/delete the logged payment of ${formatINR(item.actual_cost || 0)} for "${item.item_name}"?`;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      if (children.length > 0) {
        // Delete all child expenses first, then the parent quote itself
        await Promise.all(children.map((c) => supabase.from("budget_items").delete().eq("id", c.id)));
        // If parent has a quoted_cost it's a quote we keep; if no quoted_cost, delete entirely
        if (isCustom) {
          await supabase.from("budget_items").delete().eq("id", item.id);
        }
        const { data } = await supabase.from("budget_items").select("*").order("category");
        if (data) setItems(data as BudgetItem[]);
      } else if (isCustom) {
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
          })
          .eq("id", item.id);
        if (error) throw error;

        const { data } = await supabase.from("budget_items").select("*").order("category");
        if (data) setItems(data as BudgetItem[]);
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete. Please try again.");
    }
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
            const { data } = await supabase.from("budget_items").select("*").order("category");
            if (data) setItems(data as BudgetItem[]);
            setEditingItem(null);
          }}
        />
      )}
      {addingExpenseForItem && (
        <ExpenseForm
          initialLinkedItem={addingExpenseForItem}
          onClose={() => setAddingExpenseForItem(null)}
          onSaved={async () => {
            const { data } = await supabase.from("budget_items").select("*").order("category");
            if (data) setItems(data as BudgetItem[]);
            setAddingExpenseForItem(null);
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
                <div className="text-center py-6 bg-white border border-dashed border-border rounded-lg">
                  <p className="text-xs font-semibold text-gray-700">No funds logged yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Log bank loans or self capital here</p>
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
                  <div className="text-center py-10 bg-white rounded-xl border border-border/50 shadow-xs">
                    <p className="text-xs text-muted-foreground font-semibold">No matching budget items, vendor quotes, or expenses found. 🔍</p>
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const catItems = grouped[cat];
                    if (!catItems || catItems.length === 0) return null;
                    const catQuoted = catItems.reduce((s, i) => s + (i.quoted_cost ?? 0), 0);
                  const isOpen = budgetExpandedCat === cat || searchQueryLower !== "";

                  // Compute total paid for category: use children's sum when they exist,
                  // otherwise fall back to the item's own legacy actual_cost (never both)
                  const catActualWithChildren = catItems.reduce((s, i) => {
                    const itemChildren = childExpenseMap[i.id] || [];
                    const childrenSum = itemChildren.reduce((cs, c) => cs + (c.actual_cost ?? 0), 0);
                    const itemActual = itemChildren.length === 0 ? (i.actual_cost ?? 0) : 0;
                    return s + itemActual + childrenSum;
                  }, 0);

                  return (
                    <div key={cat} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden transition-all">
                      <button
                        onClick={() => setBudgetExpandedCat(isOpen ? null : cat)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/30 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">{cat}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatINR(catQuoted)} estimate · {catActualWithChildren > 0 ? formatINR(catActualWithChildren) + " paid" : "No actuals yet"}
                          </p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4.5 w-4.5 text-gray-400" /> : <ChevronDown className="h-4.5 w-4.5 text-gray-400" />}
                      </button>

                      {isOpen && (
                        <div className="border-t border-border divide-y divide-border bg-gray-50/10">
                          {catItems.map((item) => {
                            const children = childExpenseMap[item.id] || [];
                            const totalChildrenPaid = children.reduce((s, c) => s + (c.actual_cost ?? 0), 0);
                            const totalPaid = totalChildrenPaid + (children.length === 0 ? (item.actual_cost ?? 0) : 0);
                            const variance = totalPaid - (item.quoted_cost ?? 0);
                            const linkedPhase = phases.find((p) => p.id === item.phase_id);
                            const linkedDel = parseDeliverableFromNotes(item.notes);
                            const receiptUrl = parseReceiptFromNotes(item.notes);
                            const cleanNotes = cleanReceiptFromNotes(cleanDeliverableNotes(item.notes));
                            const isQuote = !!item.quoted_cost;
                            const isCustomExpense = !item.quoted_cost;

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
                                    {item.status && children.length === 0 && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                                        {item.status}
                                      </span>
                                    )}
                                    {children.length > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                        {children.length} payment{children.length > 1 ? "s" : ""}
                                      </span>
                                    )}
                                    {receiptUrl && (
                                      <a
                                        href={receiptUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg border border-sky-100 bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors active:scale-95"
                                        title="Download receipt"
                                      >
                                        <Paperclip className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                    {(isCustomExpense || (isQuote && item.actual_cost !== null && children.length === 0)) && (
                                      <button
                                        onClick={() => setEditingItem(item)}
                                        className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors active:scale-95"
                                        title="Edit expense"
                                      >
                                        <PencilLine className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {(item.actual_cost !== null || isCustomExpense || children.length > 0) && (
                                      <button
                                        onClick={() => handleDeleteExpense(item)}
                                        className="p-1.5 rounded-lg border border-red-100 bg-white hover:bg-red-50 text-red-500 transition-colors active:scale-95"
                                        title={isCustomExpense ? "Delete custom item" : "Delete quote"}
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
                                    <p className="font-semibold text-gray-800 font-sans mt-0.5">{totalPaid > 0 ? formatINR(totalPaid) : "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Variance</p>
                                    <p className={`font-semibold font-sans mt-0.5 ${variance > 0 ? "text-red-600" : variance < 0 ? "text-emerald-600" : "text-gray-600"}`}>
                                      {totalPaid > 0 && item.quoted_cost ? (variance > 0 ? "+" : "") + formatINR(variance) : "—"}
                                    </p>
                                  </div>
                                </div>

                                {/* Legacy single actual_cost (no children yet) */}
                                {children.length === 0 && item.actual_cost && cleanNotes && (
                                  <p className="text-[10px] text-gray-500 bg-gray-50 rounded p-1.5 mt-1 border border-gray-100/50 break-all whitespace-normal">
                                    📝 {cleanNotes}
                                  </p>
                                )}

                                {/* Child expenses list */}
                                {children.length > 0 && (
                                  <div className="mt-1 space-y-1.5 pl-1 border-l-2 border-blue-100">
                                    {children.map((child) => {
                                      const childReceiptUrl = parseReceiptFromNotes(child.notes);
                                      const childNotes = cleanReceiptFromNotes(cleanQuoteRefNotes(cleanDeliverableNotes(child.notes)));
                                      return (
                                        <div key={child.id} className="flex items-center justify-between gap-2 py-1.5 px-2 bg-gray-50/60 rounded-lg">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-semibold text-gray-800 truncate">{child.item_name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                              {child.payment_date ? formatDate(child.payment_date) : "No date"}
                                              {childNotes ? ` · ${childNotes}` : ""}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[11px] font-extrabold text-gray-900 font-sans">
                                              {formatINR(child.actual_cost)}
                                            </span>
                                            {childReceiptUrl && (
                                              <a
                                                href={childReceiptUrl}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 rounded border border-sky-100 bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors active:scale-95"
                                                title="Download receipt"
                                              >
                                                <Paperclip className="h-3 w-3" />
                                              </a>
                                            )}
                                            <button
                                              onClick={() => setEditingItem(child)}
                                              className="p-1 rounded border border-border bg-white hover:bg-gray-50 text-gray-400 transition-colors active:scale-95"
                                              title="Edit expense"
                                            >
                                              <PencilLine className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteChildExpense(child)}
                                              className="p-1 rounded border border-red-100 bg-white hover:bg-red-50 text-red-400 transition-colors active:scale-95"
                                              title="Delete expense"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Add Expense button for quotes */}
                                {isQuote && (
                                  <button
                                    onClick={() => setAddingExpenseForItem(item)}
                                    className="flex items-center gap-1.5 h-8 px-3 mt-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50 text-blue-700 text-[11px] font-bold transition-colors active:scale-95 w-full justify-center"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Expense
                                  </button>
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
