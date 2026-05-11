"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [expenses, setExpenses] = useState<BudgetItem[]>([]);
  const [funds, setFunds] = useState<Income[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [phaseStatus, setPhaseStatus] = useState<Phase[]>([]);
  const [windowStatus, setWindowStatus] = useState<Window[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadExportData() {
      if (!project?.id) return;
      setLoading(true);
      const [expenseRes, fundRes, logRes, phaseRes, windowRes] = await Promise.all([
        supabase
          .from("budget_items")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("income")
          .select("*")
          .eq("project_id", project.id)
          .order("date_received", { ascending: false }),
        supabase
          .from("daily_logs")
          .select("*")
          .eq("project_id", project.id)
          .order("log_date", { ascending: false }),
        supabase
          .from("phases")
          .select("*")
          .eq("project_id", project.id)
          .order("phase_number", { ascending: true }),
        supabase
          .from("windows")
          .select("*")
          .eq("project_id", project.id)
          .order("window_id", { ascending: true }),
      ]);

      if (!expenseRes.error) setExpenses((expenseRes.data ?? []) as BudgetItem[]);
      if (!fundRes.error) setFunds((fundRes.data ?? []) as Income[]);
      if (!logRes.error) setLogs((logRes.data ?? []) as DailyLog[]);
      if (!phaseRes.error) setPhaseStatus((phaseRes.data ?? []) as Phase[]);
      if (!windowRes.error) setWindowStatus((windowRes.data ?? []) as Window[]);
      setLoading(false);
    }

    loadExportData();
  }, [project?.id]);

  const expenseRows = useMemo(
    () =>
      expenses.map((item) => ({
        category: item.category,
        item: item.item_name,
        quoted_cost: item.quoted_cost ?? "",
        actual_cost: item.actual_cost ?? "",
        status: item.status ?? "",
        payment_date: item.payment_date ?? "",
        notes: item.notes ?? "",
        created_at: item.created_at,
      })),
    [expenses],
  );

  const fundRows = useMemo(
    () =>
      funds.map((item) => ({
        source: item.source,
        amount: item.amount,
        date_received: item.date_received,
        notes: item.notes ?? "",
        created_at: item.created_at,
      })),
    [funds],
  );

  const logRows = useMemo(
    () =>
      logs.map((log) => ({
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
      })),
    [logs],
  );

  const statusRows = useMemo(
    () => [
      ...phaseStatus.map((phase) => ({
        type: "phase",
        name: phase.name,
        status: phase.status,
        start_date: phase.start_date,
        end_date: phase.end_date,
        actual_start_date: phase.actual_start_date ?? "",
        actual_end_date: phase.actual_end_date ?? "",
        notes: phase.notes ?? "",
      })),
      ...windowStatus.map((windowItem) => ({
        type: "window",
        name: `${windowItem.room} - ${windowItem.wall} (#${windowItem.window_id})`,
        status: windowItem.status,
        start_date: windowItem.ordered_date ?? "",
        end_date: windowItem.installed_date ?? "",
        actual_start_date: windowItem.delivery_date ?? "",
        actual_end_date: windowItem.installed_date ?? "",
        notes: windowItem.notes ?? "",
      })),
    ],
    [phaseStatus, windowStatus],
  );

  function handleExport(dataset: ExportKey, format: "csv" | "excel") {
    if (!project) return;
    const today = new Date().toISOString().split("T")[0];
    const base = `${project.name.toLowerCase().replace(/\s+/g, "-")}-${dataset}-${today}`;

    const rowsByKey: Record<ExportKey, Record<string, unknown>[]> = {
      expenses: expenseRows,
      funds: fundRows,
      status: statusRows,
      logs: logRows,
    };

    const rows = rowsByKey[dataset];
    if (!rows.length) {
      alert(`No ${dataset} records found to export.`);
      return;
    }

    if (format === "csv") {
      exportCSV(`${base}.csv`, rows);
      return;
    }
    exportExcel(`${base}.xls`, rows);
  }

  function handleExportAll(format: "csv" | "excel") {
    const keys: ExportKey[] = ["expenses", "funds", "status", "logs"];
    keys.forEach((key) => handleExport(key, format));
  }

  if (!project) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
        <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Project Details
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{project.name}</p></div>
          <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{project.location ?? "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Plot Size</p><p className="font-medium">{project.plot_size ?? "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Building Area</p><p className="font-medium">{project.building_area ?? "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Budget</p><p className="font-medium">{formatINR(project.total_budget)}</p></div>
          <div><p className="text-xs text-muted-foreground">Days Left</p><p className="font-medium">{daysLeft(project.end_date)}d</p></div>
          <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{formatDate(project.start_date)}</p></div>
          <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{formatDate(project.end_date)}</p></div>
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
                  onClick={() => handleExportAll("csv")}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-white border border-border hover:bg-gray-100"
                >
                  Export All CSV
                </button>
                <button
                  onClick={() => handleExportAll("excel")}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> Export All Excel
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading export data...
                </div>
              ) : (
                <div className="space-y-2">
                  {([
                    { key: "expenses", label: "Expenses" },
                    { key: "funds", label: "Funds" },
                    { key: "status", label: "Status" },
                    { key: "logs", label: "Logs" },
                  ] as { key: ExportKey; label: string }[]).map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-border">
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExport(item.key, "csv")}
                          className="h-8 px-3 rounded-md text-xs font-medium bg-white border border-border hover:bg-gray-100"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport(item.key, "excel")}
                          className="h-8 px-3 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1"
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
