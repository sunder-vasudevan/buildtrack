"use client";

import { useState } from "react";
import { BudgetItem } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";

function groupByCategory(items: BudgetItem[]) {
  return items.reduce<Record<string, BudgetItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export function BudgetClient({ items, totalBudget }: { items: BudgetItem[]; totalBudget: number }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  const spent = items.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
  const remaining = totalBudget - spent;

  const grouped = groupByCategory(items);
  const categories = Object.keys(grouped);

  const chartData = categories.map((cat) => ({
    name: cat.length > 12 ? cat.slice(0, 12) + "…" : cat,
    Quoted: grouped[cat].reduce((s, i) => s + (i.quoted_cost ?? 0), 0),
    Actual: grouped[cat].reduce((s, i) => s + (i.actual_cost ?? 0), 0),
  }));

  const filteredCategories = filterCat === "all" ? categories : [filterCat];

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900">Budget</h1>
        <p className="text-sm text-muted-foreground">{items.length} line items</p>
      </div>

      {/* Summary cards */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">{formatINR(totalBudget)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <p className="text-xs text-orange-600">Spent</p>
            <p className="text-xl font-bold text-orange-700">{formatINR(spent)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs text-emerald-600">Remaining</p>
            <p className="text-xl font-bold text-emerald-700">{formatINR(remaining)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Spent: {totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0}%</span>
            <span>Remaining: {totalBudget > 0 ? Math.round((remaining / totalBudget) * 100) : 100}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${Math.min(100, totalBudget > 0 ? (spent / totalBudget) * 100 : 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <h2 className="font-semibold text-sm text-gray-900 mb-3">By Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Quoted" fill="#93c5fd" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Actual" fill="#f97316" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["all", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
              filterCat === cat ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-border"
            }`}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      {/* Accordion items */}
      <div className="space-y-2">
        {filteredCategories.map((cat) => {
          const catItems = grouped[cat];
          const catQuoted = catItems.reduce((s, i) => s + (i.quoted_cost ?? 0), 0);
          const catActual = catItems.reduce((s, i) => s + (i.actual_cost ?? 0), 0);
          const isOpen = expanded === cat;

          return (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : cat)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-semibold text-sm text-gray-900">{cat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatINR(catQuoted)} quoted · {catActual > 0 ? formatINR(catActual) + " actual" : "No actuals"}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {catItems.map((item) => {
                    const variance = (item.actual_cost ?? 0) - (item.quoted_cost ?? 0);
                    return (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 flex-1">{item.item_name}</p>
                          {item.status && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.status}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Quoted</p>
                            <p className="font-medium">{formatINR(item.quoted_cost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Actual</p>
                            <p className="font-medium">{item.actual_cost ? formatINR(item.actual_cost) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Variance</p>
                            <p className={`font-medium ${variance > 0 ? "text-red-600" : variance < 0 ? "text-emerald-600" : "text-gray-600"}`}>
                              {item.actual_cost ? (variance > 0 ? "+" : "") + formatINR(variance) : "—"}
                            </p>
                          </div>
                        </div>
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
  );
}
