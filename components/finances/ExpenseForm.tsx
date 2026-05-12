"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Upload, Loader2, Search, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BudgetItem } from "@/lib/types";

const CATEGORIES = [
  "Civil Labour", "Steel & TMT", "Cement & Aggregates", "Bricks & Blocks",
  "Roofing", "Windows & Doors", "Electrical (MEP)", "Plumbing (MEP)",
  "Sanitary & Fixtures", "Flooring & Tiles", "Granite & Marble",
  "Painting & Finishing", "Carpentry & Woodwork", "Solar & Energy",
  "Professional Fees", "Hardware & Fasteners", "Misc/Unplanned",
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
    amount: prefillItem?.actual_cost ? String(prefillItem.actual_cost) : (prefillItem?.quoted_cost ? String(prefillItem.quoted_cost) : ""),
    date: new Date().toISOString().split("T")[0],
    worker_name: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<string>("");
  const [showSelector, setShowSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadBudgetItems() {
      const { data } = await supabase
        .from("budget_items")
        .select("*")
        .order("category")
        .order("item_name");
      if (data) {
        // Filter out items under "Other" / "Misc/Unplanned" category, and items with no quoted_cost
        const validEstimates = (data as BudgetItem[]).filter(
          (item) =>
            item.category !== "Other" &&
            item.category !== "Others" &&
            item.category !== "Misc/Unplanned" &&
            item.quoted_cost !== null &&
            item.quoted_cost > 0
        );
        setBudgetItems(validEstimates);
      }
    }
    loadBudgetItems();
  }, []);

  const filteredBudgetItems = searchQuery.trim()
    ? budgetItems.filter(
        (item) =>
          item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : budgetItems;

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof budgetItems> = {};
    filteredBudgetItems.forEach((item) => {
      let cat = item.category || "Other";
      if (cat === "Vendor Quotes" || cat === "Additional Items") {
        cat = "Vendor Quotes & Additional Items";
      }
      if (cat === "Other" || cat === "Others") {
        cat = "Misc/Unplanned";
      }
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [filteredBudgetItems]);

  const isCategoryExpanded = (category: string) => {
    if (searchQuery.trim() !== "") {
      return true;
    }
    return !!expandedCategories[category];
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleBudgetSelectionChange = (itemId: string) => {
    setSelectedBudgetItemId(itemId);
    if (itemId === "") {
      setForm((p) => ({ ...p, item_name: "", category: "", amount: "" }));
    } else {
      const selected = budgetItems.find((item) => item.id === itemId);
      if (selected) {
        setForm((p) => ({
          ...p,
          item_name: selected.item_name,
          category: selected.category,
          amount: selected.quoted_cost ? String(selected.quoted_cost) : (selected.actual_cost ? String(selected.actual_cost) : ""),
        }));
      }
    }
  };

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

    const targetId = prefillItem?.id || selectedBudgetItemId;

    if (targetId) {
      // Find original notes to merge if updating
      const targetItem = prefillItem || budgetItems.find((item) => item.id === targetId);
      const originalNotes = targetItem?.notes || "";

      // Update existing budget item's actual cost
      await supabase
        .from("budget_items")
        .update({
          actual_cost: Number(form.amount),
          status: "Paid",
          payment_date: form.date,
          notes: [originalNotes, form.notes, form.worker_name ? `Worker: ${form.worker_name}` : "", receiptUrl ? `Receipt: ${receiptUrl}` : ""].filter(Boolean).join(" | ") || null,
        })
        .eq("id", targetId);
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto relative shadow-2xl">
        <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {prefillItem ? `Log Actual — ${prefillItem.item_name}` : "Add Expense"}
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Search Overlay Selector */}
        {showSelector && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col rounded-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-white sticky top-0 rounded-t-2xl">
              <div className="flex flex-col">
                <h3 className="font-bold text-base text-gray-900">Link Quote / Estimate</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select a budgeted quote to track actual spending</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-border bg-gray-50/50 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quotes, materials, category..."
                  className="w-full h-11 border border-border rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 font-medium"
                  autoFocus
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3 h-5 w-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20">
              {/* Option to create custom expense */}
              <button
                type="button"
                onClick={() => {
                  handleBudgetSelectionChange("");
                  setShowSelector(false);
                }}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedBudgetItemId === ""
                    ? "border-primary bg-blue-50/20 shadow-sm"
                    : "border-border bg-white hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-primary">Create Custom Expense</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Log a custom, non-budgeted payment</p>
                </div>
                {selectedBudgetItemId === "" && <div className="h-2 w-2 rounded-full bg-primary" />}
              </button>

              <div className="pt-2 pb-1">
                <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active Quotes By Category</p>
              </div>

              {filteredBudgetItems.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-gray-900">No matching quotes found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Try searching for another keyword</p>
                </div>
              ) : (
                Object.entries(groupedItems).map(([category, items]) => {
                  const isExpanded = isCategoryExpanded(category);
                  return (
                    <div key={category} className="border border-border rounded-xl bg-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-3.5 bg-gray-50/50 hover:bg-gray-100/40 transition-colors focus:outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider text-left">
                            {category}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-sans">
                            {items.length}
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                            isExpanded ? "transform rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="p-2 border-t border-border/60 divide-y divide-gray-100 bg-white space-y-1">
                          {items.map((item) => {
                            const isSelected = selectedBudgetItemId === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  handleBudgetSelectionChange(item.id);
                                  setShowSelector(false);
                                }}
                                className={`w-full p-3 rounded-lg text-left flex items-start justify-between gap-4 transition-all ${
                                  isSelected
                                    ? "bg-primary/5 border-l-2 border-primary"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <div className="min-w-0">
                                  <h4 className="font-bold text-sm text-gray-900 break-words leading-tight">
                                    {item.item_name}
                                  </h4>
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                {item.quoted_cost && (
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-sans">
                                      ₹{item.quoted_cost.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-4">
          {error && <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl p-3 border border-red-200">{error}</p>}

          {/* Link to Quote Selection */}
          {!prefillItem ? (
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Link to Quote / Budget Item</label>
              <button
                type="button"
                onClick={() => setShowSelector(true)}
                className="w-full h-11 border border-blue-100 rounded-xl px-3 text-xs bg-blue-50/20 text-blue-900 flex items-center justify-between hover:bg-blue-50/50 transition-all focus:outline-none"
              >
                {(() => {
                  const selectedItem = budgetItems.find((item) => item.id === selectedBudgetItemId);
                  if (selectedItem) {
                    return (
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-[9px] text-blue-600 uppercase font-extrabold leading-none mb-0.5">
                          {selectedItem.category}
                        </span>
                        <span className="text-xs font-bold text-blue-950 truncate max-w-full">
                          {selectedItem.item_name}
                        </span>
                      </div>
                    );
                  }
                  return <span className="text-blue-600/70 font-semibold">— Tap to search / link a Budget Quote —</span>;
                })()}
                <ChevronDown className="h-4 w-4 text-blue-400 shrink-0" />
              </button>
            </div>
          ) : (
            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex flex-col gap-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-700">Linked Estimate Quote</span>
              <span className="text-xs font-bold text-blue-950">{prefillItem.item_name}</span>
            </div>
          )}

          {/* Description Input */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Item / Description *</label>
            <input
              type="text"
              value={form.item_name}
              onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
              className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-semibold focus:border-gray-500 focus:outline-none"
              placeholder="e.g. Sand delivery, Cement purchase, Labour payment..."
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-950 font-semibold focus:border-gray-500 focus:outline-none"
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Date */}
          {(() => {
            const selectedItem = prefillItem || budgetItems.find((item) => item.id === selectedBudgetItemId);
            const rawQuotedCost = selectedItem?.quoted_cost;
            const quotedCost = rawQuotedCost !== null && rawQuotedCost !== undefined ? rawQuotedCost : undefined;
            const inputAmount = form.amount ? Number(form.amount) : 0;
            const isLinked = !!selectedItem;
            const hasAmount = form.amount !== "";
            const isOverBudget = isLinked && hasAmount && quotedCost !== undefined && inputAmount > quotedCost;
            const isUnderOrOnBudget = isLinked && hasAmount && quotedCost !== undefined && inputAmount <= quotedCost;
            const variance = isLinked && quotedCost !== undefined ? inputAmount - quotedCost : 0;

            let borderClass = "border-border focus:border-gray-500";
            if (isOverBudget) {
              borderClass = "border-red-300 focus:border-red-500 text-red-900 bg-red-50/10";
            } else if (isUnderOrOnBudget) {
              borderClass = "border-emerald-300 focus:border-emerald-500 text-emerald-900 bg-emerald-50/10";
            }

            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isOverBudget ? "text-red-600" : (isUnderOrOnBudget ? "text-emerald-700" : "text-gray-700")}`}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      className={`w-full h-11 border rounded-xl px-3 text-xs font-sans font-bold ${borderClass}`}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full h-11 border border-border rounded-xl px-3 text-xs font-sans font-semibold focus:border-gray-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Real-time Budget Status Indicator */}
                {isLinked && quotedCost !== undefined && hasAmount && (
                  <div className="mt-1">
                    {isOverBudget ? (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-700 space-y-0.5 shadow-xs">
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <span>⚠️ Over Budget!</span>
                        </p>
                        <p className="text-[11px] text-red-600 font-medium">
                          Quote estimate was <span className="font-bold">₹{quotedCost.toLocaleString("en-IN")}</span>. You are spending <span className="font-bold">+₹{variance.toLocaleString("en-IN")}</span> more than budgeted.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 space-y-0.5 shadow-xs">
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <span>✅ Under/On Budget!</span>
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Quote estimate was <span className="font-bold">₹{quotedCost.toLocaleString("en-IN")}</span>. Saving of <span className="font-bold">₹{Math.abs(variance).toLocaleString("en-IN")}</span> compared to budget.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Paid To */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Worker / Paid To</label>
            <input
              type="text"
              value={form.worker_name}
              onChange={(e) => setForm((p) => ({ ...p, worker_name: e.target.value }))}
              className="w-full h-11 border border-border rounded-xl px-3 text-xs bg-white text-gray-900 font-medium focus:border-gray-500 focus:outline-none"
              placeholder="e.g. Ravi, Sai Steel & TMT, contractors..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-xs resize-none focus:border-gray-500 focus:outline-none"
              rows={2}
              placeholder="Any additional notes or invoice references..."
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Receipt / Invoice File</label>
            <label className="flex items-center gap-3 w-full h-11 border-2 border-dashed border-sky-200 bg-sky-50/10 hover:bg-sky-50/30 rounded-xl px-3.5 cursor-pointer hover:border-sky-400 transition-colors">
              <Upload className="h-4 w-4 text-sky-600 flex-shrink-0" />
              <span className="text-xs text-sky-700 font-semibold truncate">
                {receiptFile ? receiptFile.name : "Tap to upload receipt photo or PDF..."}
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
                type="button"
                onClick={() => setReceiptFile(null)}
                className="text-[10px] font-bold text-red-600 hover:underline mt-1.5 block"
              >
                Remove Uploaded Receipt
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border border-border text-gray-900 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 bg-gray-950 hover:bg-gray-900 text-white rounded-xl font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : "Save Expense"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
