"use client";

import { useState } from "react";
import { PlanDocument } from "@/lib/types";
import { FileText, Download, Plus, Image as ImageIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function PlansTab({ initialPlans }: { initialPlans: PlanDocument[] }) {
  const [plans] = useState<PlanDocument[]>(initialPlans);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Plans & Specs</h2>
          <p className="text-sm text-muted-foreground">{plans.length} documents</p>
        </div>
        <button className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium">
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
    </div>
  );
}
