"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetItem, DailyLog, Income, Phase, Project, Window } from "@/lib/types";
import { formatINR, formatDate, daysLeft } from "@/lib/utils";
import { Building2, Download, Loader2, Settings } from "lucide-react";

type ExportKey = "expenses" | "funds" | "status" | "logs";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ];
  triggerDownload(filename, lines.join("\n"), "text/csv;charset=utf-8");
}

function exportExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const tableHead = `<tr>${headers.map((h) => `<th>${String(h)}</th>`).join("")}</tr>`;
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((key) => `<td>${String(row[key] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${tableHead}${tableRows}</table></body></html>`;
  triggerDownload(filename, html, "application/vnd.ms-excel;charset=utf-8");
}

export function ProjectInfoTab({ project }: { project: Project | null }) {
  const [loading, setLoading] = useState(false);

  async function fetchAndExport(dataset: ExportKey, format: "csv" | "excel") {
    if (!project) return;
    setLoading(true);

    try {
      let rows: Record<string, unknown>[] = [];

      if (dataset === "expenses") {
        const { data, error } = await supabase
          .from("budget_items")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          rows = (data as BudgetItem[]).map((item) => ({
            category: item.category,
            item: item.item_name,
            quoted_cost: item.quoted_cost ?? "",
            actual_cost: item.actual_cost ?? "",
            status: item.status ?? "",
            payment_date: item.payment_date ?? "",
            notes: item.notes ?? "",
            created_at: item.created_at,
          }));
        }
      } else if (dataset === "funds") {
        const { data, error } = await supabase
          .from("income")
          .select("*")
          .eq("project_id", project.id)
          .order("date_received", { ascending: false });
        if (!error && data) {
          rows = (data as Income[]).map((item) => ({
            source: item.source,
            amount: item.amount,
            date_received: item.date_received,
            notes: item.notes ?? "",
            created_at: item.created_at,
          }));
        }
      } else if (dataset === "logs") {
        const { data, error } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("project_id", project.id)
          .order("log_date", { ascending: false });
        if (!error && data) {
          rows = (data as DailyLog[]).map((log) => ({
            log_date: log.log_date,
            phase_id: log.phase_id ?? "",
            deliverable: log.deliverable_name ?? "",
            status: log.work_status ?? "",
            weather: log.weather ?? "",
            description: log.description ?? "",
            issues: log.issues ?? "",
            resolution: log.resolution ?? "",
            photos_count: log.photos?.length ?? 0,
            created_at: log.created_at,
          }));
        }
      } else if (dataset === "status") {
        const [phaseRes, windowRes] = await Promise.all([
          supabase.from("phases").select("*").eq("project_id", project.id).order("phase_number", { ascending: true }),
          supabase.from("windows").select("*").eq("project_id", project.id).order("window_id", { ascending: true }),
        ]);

        const phases = (phaseRes.data ?? []) as Phase[];
        const windows = (windowRes.data ?? []) as Window[];

        rows = [
          ...phases.map((phase) => ({
            type: "phase",
            name: phase.name,
            status: phase.status,
            start_date: phase.start_date,
            end_date: phase.end_date,
            actual_start_date: phase.actual_start_date ?? "",
            actual_end_date: phase.actual_end_date ?? "",
            notes: phase.notes ?? "",
          })),
          ...windows.map((windowItem) => ({
            type: "window",
            name: `${windowItem.room} - ${windowItem.wall} (#${windowItem.window_id})`,
            status: windowItem.status,
            start_date: windowItem.ordered_date ?? "",
            end_date: windowItem.installed_date ?? "",
            actual_start_date: windowItem.delivery_date ?? "",
            actual_end_date: windowItem.installed_date ?? "",
            notes: windowItem.notes ?? "",
          })),
        ];
      }

      if (!rows.length) {
        alert(`No records found for ${dataset} to export.`);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const base = `${project.name.toLowerCase().replace(/\s+/g, "-")}-${dataset}-${today}`;

      if (format === "csv") {
        exportCSV(`${base}.csv`, rows);
      } else {
        exportExcel(`${base}.xls`, rows);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAndExportAll(format: "csv" | "excel") {
    if (!project) return;
    setLoading(true);
    const keys: ExportKey[] = ["expenses", "funds", "status", "logs"];
    try {
      for (const key of keys) {
        await fetchAndExport(key, format);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!project) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
        <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
          <Building2 className="h-4.5 w-4.5 text-gray-500" /> Project Details
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Name</p><p className="font-semibold text-gray-950">{project.name}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Location</p><p className="font-semibold text-gray-950">{project.location ?? "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Plot Size</p><p className="font-semibold text-gray-950 font-sans">{project.plot_size ?? "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Building Area</p><p className="font-semibold text-gray-950 font-sans">{project.building_area ?? "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Budget</p><p className="font-semibold text-gray-950 font-sans">{formatINR(project.total_budget)}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Days Left</p><p className="font-semibold text-gray-950 font-sans">{daysLeft(project.end_date)}d</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Start</p><p className="font-semibold text-gray-950 font-sans">{formatDate(project.start_date)}</p></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">End</p><p className="font-semibold text-gray-950 font-sans">{formatDate(project.end_date)}</p></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-medium text-sm text-gray-900">Settings & Export</p>
                <p className="text-xs text-muted-foreground">
                  Download project data as CSV or Excel.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAndExportAll("csv")}
                  disabled={loading}
                  className="h-8 px-3 rounded-md text-xs font-semibold bg-white border border-border hover:bg-gray-50 disabled:opacity-50"
                >
                  Export All CSV
                </button>
                <button
                  onClick={() => fetchAndExportAll("excel")}
                  disabled={loading}
                  className="h-8 px-3 rounded-md text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> Export All Excel
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold bg-blue-50/50 p-3 rounded-lg border border-blue-100 animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching & compiling database export... please wait.
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {([
                    { key: "expenses", label: "Expenses" },
                    { key: "funds", label: "Funds" },
                    { key: "status", label: "Status" },
                    { key: "logs", label: "Logs" },
                  ] as { key: ExportKey; label: string }[]).map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-2 bg-gray-50/50 rounded-lg px-3 py-2 border border-border">
                      <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => fetchAndExport(item.key, "csv")}
                          className="h-8 px-2.5 rounded-md text-xs font-medium bg-white border border-border hover:bg-gray-50"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => fetchAndExport(item.key, "excel")}
                          className="h-8 px-2.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> Excel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
