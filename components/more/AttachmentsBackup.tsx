"use client";

import { useState } from "react";
import { Download, CloudUpload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { collectAttachments } from "@/lib/attachments";

type Category = "receipts" | "logs" | "plans";

const CATEGORIES: { key: Category; label: string; description: string }[] = [
  { key: "receipts", label: "Receipts", description: "All 📎 expense attachments" },
  { key: "logs", label: "Site Photos", description: "Daily log photos" },
  { key: "plans", label: "Plans", description: "Floor plans & documents" },
];

type Status = "idle" | "running" | "done" | "error";

interface Progress {
  current: number;
  total: number;
  label: string;
}

export function AttachmentsBackup() {
  const [selected, setSelected] = useState<Set<Category>>(new Set(["receipts", "logs", "plans"]));
  const [zipStatus, setZipStatus] = useState<Status>("idle");
  const [driveStatus, setDriveStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [driveResult, setDriveResult] = useState<{ uploaded: number; skipped: number; errors: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function toggleCategory(cat: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  async function handleDownloadZip() {
    if (!selected.size) return;
    setZipStatus("running");
    setProgress({ current: 0, total: 0, label: "Collecting file list…" });
    setErrorMsg("");

    try {
      const files = await collectAttachments(Array.from(selected));
      if (!files.length) {
        setZipStatus("done");
        setProgress(null);
        return;
      }

      const zip = new JSZip();
      const date = new Date().toISOString().split("T")[0];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length, label: `Fetching ${file.folder}/${file.filename}` });
        try {
          const res = await fetch(file.url);
          if (!res.ok) continue;
          const blob = await res.blob();
          zip.folder(file.folder)!.file(file.filename, blob);
        } catch {
          // skip unreadable files silently
        }
      }

      setProgress({ current: files.length, total: files.length, label: "Building ZIP…" });
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `buildtrack-backup-${date}.zip`);
      setZipStatus("done");
      setProgress(null);
    } catch (err) {
      setErrorMsg("ZIP download failed. Please try again.");
      setZipStatus("error");
      setProgress(null);
    }
  }

  async function handleBackupToDrive() {
    if (!selected.size) return;
    setDriveStatus("running");
    setDriveResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/backup-to-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Drive backup failed.");
        setDriveStatus("error");
        return;
      }
      setDriveResult(json);
      setDriveStatus("done");
    } catch {
      setErrorMsg("Could not reach the server. Check your connection.");
      setDriveStatus("error");
    }
  }

  const noneSelected = selected.size === 0;
  const isRunning = zipStatus === "running" || driveStatus === "running";

  return (
    <div className="space-y-4">
      {/* Category selector */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Select what to include</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ key, label, description }) => {
            const active = selected.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                disabled={isRunning}
                className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all disabled:opacity-50 ${
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-border hover:bg-gray-50"
                }`}
              >
                <span className="text-xs font-bold">{label}</span>
                <span className={`text-[10px] mt-0.5 ${active ? "text-gray-300" : "text-muted-foreground"}`}>
                  {description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
            <span className="truncate">{progress.label}</span>
            {progress.total > 0 && (
              <span className="shrink-0 ml-2">{progress.current}/{progress.total}</span>
            )}
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-gray-900 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Drive result summary */}
      {driveResult && driveStatus === "done" && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Drive backup complete — {driveResult.uploaded} uploaded
            {driveResult.skipped > 0 ? `, ${driveResult.skipped} already existed` : ""}
            {driveResult.errors > 0 ? `, ${driveResult.errors} failed` : ""}.
          </span>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-red-700 text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={noneSelected || isRunning}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 active:scale-95"
        >
          {zipStatus === "running" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…</>
          ) : zipStatus === "done" && !progress ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Downloaded</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> Download ZIP</>
          )}
        </button>

        <button
          type="button"
          onClick={handleBackupToDrive}
          disabled={noneSelected || isRunning}
          className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 active:scale-95"
        >
          {driveStatus === "running" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Backing up…</>
          ) : driveStatus === "done" ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Backed Up</>
          ) : (
            <><CloudUpload className="h-3.5 w-3.5" /> Backup to Drive</>
          )}
        </button>
      </div>

      {noneSelected && (
        <p className="text-[11px] text-muted-foreground text-center">Select at least one category above.</p>
      )}
    </div>
  );
}
