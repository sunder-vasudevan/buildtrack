"use client";

import { useState } from "react";
import { DailyLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Activity, ChevronDown, Calendar, CloudSun } from "lucide-react";

interface RecentActivityWidgetProps {
  recentLogs: DailyLog[];
}

export function RecentActivityWidget({ recentLogs }: RecentActivityWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-500 shrink-0" />
          <h2 className="font-semibold text-sm text-gray-900 text-left">Recent Activity</h2>
          {recentLogs.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {recentLogs.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4.5 w-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "transform rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border/60 space-y-4 bg-gray-50/10">
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
              <p className="text-sm font-medium text-gray-950">No logs yet 📝</p>
              <p className="text-xs text-muted-foreground">Start tracking daily site progress logs.</p>
            </div>
          ) : (
            <div className="space-y-3.5 mt-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-blue-400 pl-3.5 py-0.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-sans">{formatDate(log.log_date)}</span>
                    {log.weather && (
                      <span className="flex items-center gap-0.5 ml-2 text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                        <CloudSun className="h-3 w-3" />
                        {log.weather}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 font-medium break-words leading-relaxed">
                    {log.description ?? "No description"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
