"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StepProject } from "@/components/setup/StepProject";
import { StepPhases, DEFAULT_PHASES, PhaseData } from "@/components/setup/StepPhases";
import { StepPreferences, DEFAULT_PREFERENCES, Preferences } from "@/components/setup/StepPreferences";
import { StepConfirm } from "@/components/setup/StepConfirm";

interface ProjectData {
  name: string;
  location: string;
  plot_size: string;
  building_area: string;
  total_budget: string;
  start_date: string;
  end_date: string;
}

const EMPTY_PROJECT: ProjectData = {
  name: "",
  location: "",
  plot_size: "",
  building_area: "",
  total_budget: "",
  start_date: "",
  end_date: "",
};

const STEPS = ["Project", "Phases", "Preferences", "Confirm"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [projectData, setProjectData] = useState<ProjectData>(EMPTY_PROJECT);
  const [phases, setPhases] = useState<PhaseData[]>(DEFAULT_PHASES);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setCreating(true);
    setError("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Session expired. Please log in again.");
      setCreating(false);
      return;
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        name: projectData.name,
        location: projectData.location,
        plot_size: projectData.plot_size,
        building_area: projectData.building_area,
        total_budget: Number(projectData.total_budget),
        start_date: projectData.start_date,
        end_date: projectData.end_date,
        user_id: user.id,
        preferences,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      setError("Failed to create project. Please try again.");
      setCreating(false);
      return;
    }

    const phaseInserts = phases.map((phase, idx) => ({
      project_id: project.id,
      user_id: user.id,
      phase_number: idx,
      name: phase.name,
      start_date: phase.start_date || projectData.start_date,
      end_date: phase.end_date || projectData.end_date,
      deliverables: phase.deliverables.map((name) => ({ name, planned_start: null, planned_due: null, actual_due: null })),
      status: "Not Started",
    }));

    const { error: phasesError } = await supabase.from("phases").insert(phaseInserts);

    if (phasesError) {
      setError("Project created but phases failed. Please add phases manually.");
      setCreating(false);
      router.replace("/dashboard");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <HardHat className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-sm">BuildTrack Setup</h1>
          <p className="text-xs text-gray-500">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 px-4 pt-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-gray-200"}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {step === 0 && (
          <StepProject
            data={projectData}
            onChange={setProjectData}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepPhases
            phases={phases}
            onChange={setPhases}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepPreferences
            preferences={preferences}
            onChange={setPreferences}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepConfirm
            project={projectData}
            phases={phases}
            preferences={preferences}
            onConfirm={handleCreate}
            onBack={() => setStep(2)}
            creating={creating}
          />
        )}
      </div>
    </div>
  );
}
