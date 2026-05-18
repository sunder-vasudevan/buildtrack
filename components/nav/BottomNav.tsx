"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Building2, Kanban, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddModal } from "@/components/ui/QuickAddModal";
import { supabase } from "@/lib/supabase";
import { usePrefs } from "@/lib/prefs-context";

const ALL_TABS_LEFT = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, colorClass: "text-amber-600", bgClass: "bg-amber-50/80 border border-amber-100/50", prefKey: "overview" as const },
  { href: "/tracker", label: "Tracker", icon: Kanban, colorClass: "text-amber-600", bgClass: "bg-amber-50/80 border border-amber-100/50", prefKey: "tracker" as const },
];

const ALL_TABS_RIGHT = [
  { href: "/finances", label: "Finances", icon: Wallet, colorClass: "text-amber-600", bgClass: "bg-amber-50/80 border border-amber-100/50", prefKey: "finances" as const },
  { href: "/more", label: "More", icon: Building2, colorClass: "text-amber-600", bgClass: "bg-amber-50/80 border border-amber-100/50", prefKey: "more" as const },
];

function NavLink({ href, label, icon: Icon, active, badgeCount, colorClass, bgClass }: any) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-extrabold transition-all duration-300 relative active:scale-95",
        active ? `${colorClass} ${bgClass} shadow-xs scale-105` : "text-gray-500 hover:bg-gray-100/30"
      )}
    >
      <div className="relative">
        <Icon className={cn("h-4.5 w-4.5 transition-transform duration-300", active && "scale-110")} />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {badgeCount}
          </span>
        )}
      </div>
      <span>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/auth") || pathname === "/setup") return null;
  const [reminderCount, setReminderCount] = useState(0);
  const [isHidden, setIsHidden] = useState(false);
  const { prefs } = usePrefs();

  useEffect(() => {
    async function fetchCount() {
      const getLocalTodayStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const { count, error } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("done", false)
        .lte("due_date", getLocalTodayStr());

      if (!error && count !== null) {
        setReminderCount(count);
      }
    }

    fetchCount();

    const channel = supabase
      .channel("nav_reminders_count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border pb-safe shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out transform",
          isHidden ? "translate-y-full" : "translate-y-0"
        )}
      >
        {/* Collapse handle bar */}
        <button
          onClick={() => setIsHidden(true)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-12 bg-white border-t border-x border-border rounded-t-xl flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-[0_-3px_6px_rgba(0,0,0,0.03)] active:scale-95 transition-all z-50 cursor-pointer"
          title="Minimize Navigation Bar"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-around h-15 px-2">
          <div className="flex items-center justify-around flex-1">
            {ALL_TABS_LEFT.filter((t) => prefs.tabs[t.prefKey]).map((tab) => (
              <NavLink
                key={tab.href}
                {...tab}
                active={pathname.startsWith(tab.href)}
                badgeCount={tab.href === "/dashboard" ? reminderCount : 0}
              />
            ))}
          </div>

          {/* Center Quick Add Button */}
          <div className="shrink-0 px-1">
            <QuickAddModal quickAddPrefs={prefs.quickAdd} quickAddOrder={prefs.quickAddOrder} />
          </div>

          <div className="flex items-center justify-around flex-1">
            {ALL_TABS_RIGHT.filter((t) => prefs.tabs[t.prefKey]).map((tab) => (
              <NavLink
                key={tab.href}
                {...tab}
                active={pathname.startsWith(tab.href)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Floating menu toggle when hidden */}
      {isHidden && (
        <button
          onClick={() => setIsHidden(false)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 h-10 px-4 bg-gray-950/95 text-white text-xs font-black rounded-full flex items-center gap-1.5 shadow-2xl active:scale-95 hover:bg-gray-900 transition-all z-50 border border-white/15 animate-fade-in animate-bounce-subtle cursor-pointer"
        >
          <span>🌟 Show Navigation Menu</span>
        </button>
      )}
    </>
  );
}
