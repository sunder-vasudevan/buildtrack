"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, MoreHorizontal, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddModal } from "@/components/ui/QuickAddModal";

const tabsLeft = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: Kanban },
];

const tabsRight = [
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

function NavLink({ href, label, icon: Icon, active }: any) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] sm:text-xs font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "text-primary")} />
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        <div className="flex items-center justify-around flex-1">
          {tabsLeft.map((tab) => (
            <NavLink key={tab.href} {...tab} active={pathname.startsWith(tab.href)} />
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
