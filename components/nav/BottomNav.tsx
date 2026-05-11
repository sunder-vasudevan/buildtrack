"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Square, Wallet, BookOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/windows", label: "Windows", icon: Square },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/logs", label: "Logs", icon: BookOpen },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
