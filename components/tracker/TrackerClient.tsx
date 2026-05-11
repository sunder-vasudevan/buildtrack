"use client";

import { useState } from "react";
import { Phase, DailyLog } from "@/lib/types";
import { ChevronDown, ChevronUp, Kanban, BookOpen } from "lucide-react";
import { PhasesClient } from "@/components/tracker/PhasesTab";
import { LogsClient } from "@/components/tracker/LogsTab";

interface TrackerClientProps {
  phases: Phase[];
  logs: DailyLog[];
}

export function TrackerClient({ phases, logs }: TrackerClientProps) {
  const [phasesExpanded, setPhasesExpanded] = useState(true);
  const [logsExpanded, setLogsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Drawer 1: Construction Phases & Milestones */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setPhasesExpanded(!phasesExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Kanban className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Phases & Schedule Progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track schedule milestones, deliverables, and variance
              </p>
            </div>
          </div>
          {phasesExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {phasesExpanded && (
          <div className="border-t border-border bg-gray-50/10 p-2">
            <PhasesClient initialPhases={phases} />
          </div>
        )}
      </div>

      {/* Drawer 2: Daily Progress Logs */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setLogsExpanded(!logsExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Daily Progress Logbook</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {logs.length} journal logs, weather condition, and progress photos
              </p>
            </div>
          </div>
          {logsExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {logsExpanded && (
          <div className="border-t border-border bg-gray-50/10 p-2">
            <LogsClient initialLogs={logs} phases={phases} />
          </div>
        )}
      </div>
    </div>
  );
}
