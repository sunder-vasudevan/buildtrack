"use client";

import { useState } from "react";
import { Worker } from "@/lib/types";
import { Phone, Users, Plus, HardHat } from "lucide-react";

export function TeamTab({ initialWorkers }: { initialWorkers: Worker[] }) {
  const [workers] = useState<Worker[]>(initialWorkers);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Directory</h2>
          <p className="text-sm text-muted-foreground">{workers.length} team members</p>
        </div>
        <button className="flex items-center gap-1.5 h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Worker
        </button>
      </div>

      {workers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-border">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No workers added yet. Keep your team directory here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <div key={worker.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center flex-shrink-0">
                <HardHat className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base truncate">{worker.name}</h3>
                <p className="text-xs text-muted-foreground">{worker.role || "Worker"}</p>
                {worker.skills && worker.skills.length > 0 && (
                  <div className="flex gap-1 mt-1 overflow-x-auto pb-1">
                    {worker.skills.map((skill, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {worker.phone ? (
                <a href={`tel:${worker.phone}`} className="p-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-full transition-colors flex-shrink-0 shadow-sm border border-green-200">
                  <Phone className="h-5 w-5 fill-current" />
                </a>
              ) : (
                <div className="p-3 bg-gray-50 text-gray-300 rounded-full flex-shrink-0 border border-gray-100">
                  <Phone className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
