"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Project } from "@/lib/types";
import { HardDrive, Cloud, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  project: Project | null;
}

export function BackupTab({ project }: Props) {
  const [status, setStatus] = useState<"idle" | "fetching" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleExport() {
    setStatus("fetching");
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [phases, budget, logs, income, payments, workers, docs, reminders] = await Promise.all([
        supabase.from("phases").select("*").eq("user_id", user.id),
        supabase.from("budget_items").select("*").eq("user_id", user.id),
        supabase.from("daily_logs").select("*").eq("user_id", user.id),
        supabase.from("income").select("*").eq("user_id", user.id),
        supabase.from("payments").select("*").eq("user_id", user.id),
        supabase.from("workers").select("*").eq("user_id", user.id),
        supabase.from("documents").select("*").eq("user_id", user.id),
        supabase.from("reminders").select("*").eq("user_id", user.id),
      ]);

      const snapshot = {
        exportedAt: new Date().toISOString(),
        project,
        phases: phases.data ?? [],
        budgetItems: budget.data ?? [],
        dailyLogs: logs.data ?? [],
        income: income.data ?? [],
        payments: payments.data ?? [],
        workers: workers.data ?? [],
        documents: docs.data ?? [],
        reminders: reminders.data ?? [],
      };

      const date = new Date().toISOString().split("T")[0];
      const projectName = (project?.name ?? "buildtrack").replace(/\s+/g, "-").toLowerCase();
      const filename = `buildtrack-backup-${projectName}-${date}.json`;

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2.5 rounded-xl">
          <HardDrive className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Backup & Storage</h2>
          <p className="text-xs text-gray-500">Your files and project data are always safe</p>
        </div>
      </div>

      {/* Auto-backup info */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
        <Cloud className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Files auto-saved to cloud</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            All photos and PDFs you upload are automatically stored securely in Backblaze B2 cloud storage.
            Nothing is stored only on your device — files are safe even if you reinstall or switch phones.
          </p>
        </div>
      </div>

      {/* Manual export */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-800">Export project data</p>
          <p className="text-xs text-gray-500">Download a full JSON snapshot of your project data to your device. Save it to Google Drive, OneDrive, or anywhere you like.</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">Includes</p>
          <ul className="text-xs text-gray-500 space-y-1">
            {["Project details", "All phases & deliverables", "Daily logs", "Budget items", "Payments", "Funds received", "Team / workers", "Documents list", "Reminders"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="text-emerald-500">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {status === "done" ? (
          <div className="flex items-center gap-2 py-2 text-emerald-700 text-sm font-medium">
            <CheckCircle className="h-5 w-5" /> Downloaded to your device
          </div>
        ) : status === "error" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
            <button onClick={() => setStatus("idle")} className="text-xs text-primary underline">Try again</button>
          </div>
        ) : (
          <button
            onClick={handleExport}
            disabled={status === "fetching"}
            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {status === "fetching" ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing export…</> : <><Download className="h-4 w-4" /> Download JSON backup</>}
          </button>
        )}
      </div>
    </div>
  );
}
