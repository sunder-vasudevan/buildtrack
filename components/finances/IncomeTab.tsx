"use client";

import { useState } from "react";
import { Income } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { Plus, ArrowDownToLine, Landmark } from "lucide-react";

export function IncomeTab({ initialIncome }: { initialIncome: Income[] }) {
  const [incomes] = useState<Income[]>(initialIncome);
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Income & Funding</h2>
          <p className="text-sm text-muted-foreground">{incomes.length} records</p>
        </div>
        <button className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Funds
        </button>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-sm">
        <p className="text-xs text-emerald-700 font-medium">Total Income Received</p>
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
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatDate(income.date_received)}</span>
                </div>
                {income.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{income.notes}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-emerald-700">{formatINR(income.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
