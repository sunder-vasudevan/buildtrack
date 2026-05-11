"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, MoreHorizontal, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddModal } from "@/components/ui/QuickAddModal";
import { supabase } from "@/lib/supabase";

const tabsLeft = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: Kanban },
];

const tabsRight = [
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

function NavLink({ href, label, icon: Icon, active, badgeCount }: any) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] sm:text-xs font-medium transition-colors relative",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className="relative">
        <Icon className={cn("h-5 w-5", active && "text-primary")} />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {badgeCount}
          </span>
        )}
      </div>
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [reminderCount, setReminderCount] = useState(0);

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        <div className="flex items-center justify-around flex-1">
          {tabsLeft.map((tab) => (
            <NavLink
              key={tab.href}
              {...tab}
              active={pathname.startsWith(tab.href)}
              badgeCount={tab.href === "/dashboard" ? reminderCount : 0}
            />
          ))}
        </div>
        
        {/* Center Quick Add Button */}
        <div className="shrink-0 px-2">
          <QuickAddModal />
        </div>

        <div className="flex items-center justify-around flex-1">
          {tabsRight.map((tab) => (
            <NavLink key={tab.href} {...tab} active={pathname.startsWith(tab.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
