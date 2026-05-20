"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { HelpCircle, LogOut, X } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const HELP_SECTIONS = [
  { title: "Navigation", items: [
    { label: "Overview", desc: "Dashboard: budget summary, net cash balance, recent logs, reminders" },
    { label: "Tracker", desc: "Phases, daily logs, uploaded plans & specs" },
    { label: "Finances", desc: "Budget items + funds received" },
    { label: "More", desc: "Project details, team, exports, preferences, backup" },
  ]},
  { title: "Quick Add (+ button)", items: [
    { label: "Log Work", desc: "Daily site progress with photos, phase & deliverable" },
    { label: "Add Expense", desc: "Record a payment — link to phase/deliverable later" },
    { label: "Add Funds", desc: "Record money received (loan, contribution, etc.)" },
    { label: "Reminder", desc: "Set a reminder with a due date" },
    { label: "Wish List", desc: "Add backlog items or future ideas" },
    { label: "Note", desc: "Quick freeform note" },
  ]},
  { title: "Phases & Deliverables", items: [
    { label: "Phases", desc: "Main build stages (Foundation, Walls, Finishes…)" },
    { label: "Deliverables", desc: "Specific tasks — turns green when complete, red if overdue" },
  ]},
  { title: "Finances", items: [
    { label: "Budget", desc: "All items by category — quoted vs actual cost" },
    { label: "Funds", desc: "All capital received — source, amount, date" },
    { label: "Unplanned Expenses", desc: "Payments not tied to a budget item — link them later" },
    { label: "Net Cash Balance", desc: "Total funds received − total expenses paid" },
  ]},
  { title: "Troubleshooting", items: [
    { label: "Data not showing", desc: "Refresh the page" },
    { label: "Photos not uploading", desc: "Check internet connection; max 10MB" },
    { label: "Can't log in", desc: "Use Forgot Password on the login page" },
  ]},
];

export function TopBar() {
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("projects").select("name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.name) setProjectName(data.name);
      });
    });
  }, []);

  if (pathname.startsWith("/auth") || pathname === "/setup") return null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-border h-12 flex items-center justify-between px-4 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <Image src="/crane.svg" alt="BuildTrack" width={20} height={20} className="shrink-0" />
          <span className="font-bold text-gray-900 text-sm shrink-0">BuildTrack</span>
          {projectName && (
            <>
              <span className="text-gray-300 text-sm shrink-0">·</span>
              <span className="text-sm text-gray-500 truncate">{projectName}</span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-gray-700" />
                <h2 className="font-bold text-gray-900">Help Guide</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-5 text-sm">
              {HELP_SECTIONS.map(({ title, items }) => (
                <div key={title}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
                  <div className="space-y-2">
                    {items.map(({ label, desc }) => (
                      <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="font-semibold text-gray-800 text-xs">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-center text-gray-400 pb-4">v2.3.0 · 19 May 2026 · buildtrackapp.vercel.app</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
