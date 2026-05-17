"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

export interface PhaseData {
  name: string;
  start_date: string;
  end_date: string;
  budget_estimate: string;
  deliverables: string[];
}

const DEFAULT_PHASES: PhaseData[] = [
  {
    name: "Site Preparation",
    start_date: "",
    end_date: "",
    budget_estimate: "",
    deliverables: ["Site clearing and leveling", "Mark boundaries", "Temporary water/power", "Material storage area"],
  },
  {
    name: "Foundation & Footings",
    start_date: "",
    end_date: "",
    budget_estimate: "",
    deliverables: ["Excavation complete", "Footings poured", "Foundation walls", "Damp proofing applied"],
  },
  {
    name: "Walls & Brickwork",
    start_date: "",
    end_date: "",
    budget_estimate: "",
    deliverables: ["Load-bearing walls up", "Lintel beams placed", "Window/door frames set"],
  },
  {
    name: "Plastering & MEP",
    start_date: "",
    end_date: "",
    budget_estimate: "",
    deliverables: ["Internal plastering", "External render", "Electrical rough-in", "Plumbing rough-in"],
  },
  {
    name: "Finishes",
    start_date: "",
    end_date: "",
    budget_estimate: "",
    deliverables: ["Floor tiling", "Wall tiling (wet areas)", "Painting — internal", "Painting — external", "Fixtures & fittings"],
  },
  {
    name: "Testing & Handover",
    start_date: "",
    end_date: "",
    budget_estimate: "",
    deliverables: ["Electrical test & certification", "Plumbing pressure test", "Punch list walkthrough", "Final clean", "Handover documentation"],
  },
];

interface Props {
  phases: PhaseData[];
  onChange: (phases: PhaseData[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPhases({ phases, onChange, onNext, onBack }: Props) {
  const [newDeliverable, setNewDeliverable] = useState<Record<number, string>>({});

  function updatePhase(i: number, field: keyof PhaseData, value: string) {
    const updated = phases.map((p, idx) => idx === i ? { ...p, [field]: value } : p);
    onChange(updated);
  }

  function addDeliverable(i: number) {
    const val = (newDeliverable[i] ?? "").trim();
    if (!val) return;
    const updated = phases.map((p, idx) =>
      idx === i ? { ...p, deliverables: [...p.deliverables, val] } : p
    );
    onChange(updated);
    setNewDeliverable((prev) => ({ ...prev, [i]: "" }));
  }

  function removeDeliverable(phaseIdx: number, dIdx: number) {
    const updated = phases.map((p, idx) =>
      idx === phaseIdx ? { ...p, deliverables: p.deliverables.filter((_, di) => di !== dIdx) } : p
    );
    onChange(updated);
  }

  function addPhase() {
    onChange([...phases, { name: "", start_date: "", end_date: "", budget_estimate: "", deliverables: [] }]);
  }

  function removePhase(i: number) {
    onChange(phases.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Phases & Deliverables</h2>
        <p className="text-sm text-gray-500 mt-1">Customise your build phases and what needs to get done in each.</p>
      </div>

      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
        {phases.map((phase, i) => (
          <div key={i} className="border rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
              <input
                value={phase.name}
                onChange={(e) => updatePhase(i, "name", e.target.value)}
                placeholder="Phase name"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
              />
              <button onClick={() => removePhase(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start</label>
                <input
                  type="date"
                  value={phase.start_date}
                  onChange={(e) => updatePhase(i, "start_date", e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End</label>
                <input
                  type="date"
                  value={phase.end_date}
                  onChange={(e) => updatePhase(i, "end_date", e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Budget (₹)</label>
                <input
                  type="number"
                  value={phase.budget_estimate}
                  onChange={(e) => updatePhase(i, "budget_estimate", e.target.value)}
                  placeholder="0"
                  className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Deliverables</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {phase.deliverables.map((d, di) => (
                  <span key={di} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {d}
                    <button onClick={() => removeDeliverable(i, di)} className="text-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newDeliverable[i] ?? ""}
                  onChange={(e) => setNewDeliverable((prev) => ({ ...prev, [i]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDeliverable(i))}
                  placeholder="Add deliverable, press Enter"
                  className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => addDeliverable(i)}
                  className="text-primary border border-primary/30 rounded-lg px-2 py-1.5 text-xs hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addPhase}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Add phase
      </button>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 border rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={phases.length === 0}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Next: Preferences →
        </button>
      </div>
    </div>
  );
}

export { DEFAULT_PHASES };
