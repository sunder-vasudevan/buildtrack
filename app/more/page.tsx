"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Project, Window, PlanDocument, Reminder } from "@/lib/types";
import { ProjectInfoTab } from "@/components/more/ProjectInfoTab";
import { UsersTab } from "@/components/more/UsersTab";
import { BackupTab } from "@/components/more/BackupTab";
import { Building2, Users, HardDrive, LogOut } from "lucide-react";

const ADMIN_EMAIL = "sunder.v@outlook.com";

type Tab = "info" | "users" | "backup";

export default function MorePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [project, setProject] = useState<Project | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [plans, setPlans] = useState<PlanDocument[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check session synchronously first — avoids tab bar flash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) setIsAdmin(true);
    });

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsAdmin(user.email === ADMIN_EMAIL);

      const [projectRes, windowsRes, documentsRes, remindersRes] = await Promise.all([
        supabase.from("projects").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("windows").select("*").order("window_id"),
        supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("reminders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      setProject(projectRes.data as Project | null);
      setWindows((windowsRes.data ?? []) as Window[]);
      setPlans((documentsRes.data ?? []) as PlanDocument[]);
      setReminders((remindersRes.data ?? []) as Reminder[]);
    }
    load();
  }, []);

  const tabs = [
    { key: "info" as Tab, label: "Project Info", icon: Building2 },
    { key: "backup" as Tab, label: "Backup", icon: HardDrive },
    ...(isAdmin ? [{ key: "users" as Tab, label: "Users", icon: Users }] : []),
  ];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900">More</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === key ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto mb-safe">
        {tab === "info" && (
          <ProjectInfoTab
            project={project}
            initialWindows={windows}
            initialPlans={plans}
            initialReminders={reminders}
          />
        )}
        {tab === "backup" && <BackupTab project={project} />}
        {tab === "users" && isAdmin && <UsersTab />}

        <div className="pt-8 pb-16 flex flex-col items-center gap-3 shrink-0">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/auth/login"); }}
            className="flex items-center gap-2 text-sm text-red-500 font-medium px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <p className="text-xs text-muted-foreground">v2.3.0 · 20 May 2026 · Built in Hyderabad with ❤️</p>
        </div>
      </div>
    </div>
  );
}
