"use client";

import { PhaseData } from "./StepPhases";
import { Preferences } from "./StepPreferences";

interface ProjectData {
  name: string;
  location: string;
  plot_size: string;
  building_area: string;
  total_budget: string;
  start_date: string;
  end_date: string;
}

interface Props {
  project: ProjectData;
  phases: PhaseData[];
  preferences: Preferences;
  onConfirm: () => void;
  onBack: () => void;
  creating: boolean;
}

export function StepConfirm({ project, phases, preferences, onConfirm, onBack, creating }: Props) {
  const enabledTabs = Object.entries(preferences.tabs).filter(([, v]) => v).map(([k]) => k);
  const enabledQuickAdd = Object.entries(preferences.quickAdd).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review & Create</h2>
        <p className="text-sm text-gray-500 mt-1">Everything looks good? Let's set up your project.</p>
      </div>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {/* Project summary */}
        <div className="bg-white border rounded-xl p-4 space-y-1.5">
          <h3 className="font-semibold text-gray-900">{project.name}</h3>
          {project.location && <p className="text-xs text-gray-500">📍 {project.location}</p>}
          <p className="text-xs text-gray-500">
            📅 {project.start_date} → {project.end_date}
          </p>
          <p className="text-xs text-gray-500">
            💰 ₹{Number(project.total_budget).toLocaleString("en-IN")} budget
          </p>
          {project.plot_size && <p className="text-xs text-gray-500">📐 {project.plot_size} · {project.building_area}</p>}
        </div>

        {/* Phases */}
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">{phases.length} Phases</h3>
          {phases.map((phase, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm font-medium text-gray-700">#{i + 1} {phase.name}</p>
              {phase.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {phase.deliverables.map((d, di) => (
                    <span key={di} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Preferences */}
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-gray-800 text-sm">App Preferences</h3>
          <p className="text-xs text-gray-600">
            <span className="font-medium">Tabs: </span>
            {enabledTabs.length === 4 ? "All tabs" : enabledTabs.join(", ")}
          </p>
          <p className="text-xs text-gray-600">
            <span className="font-medium">Quick Add: </span>
            {enabledQuickAdd.length === 6 ? "All options" : enabledQuickAdd.join(", ")}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} disabled={creating} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
          ← Back
        </button>
        <button
          onClick={onConfirm}
          disabled={creating}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {creating ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Creating…
            </>
          ) : "🚀 Create Project"}
        </button>
      </div>
    </div>
  );
}
