"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "sunder.v@outlook.com";

const FULL_CHANGELOG = [
  {
    version: "v2.2.0",
    date: "18 May 2026",
    type: "minor",
    items: [
      "TopBar: sign-out + help panel available on every page/tab",
      "Forgot password flow with Supabase reset email",
      "Crane SVG icon in TopBar (replaced HardHat)",
      "Changelog modal z-index fix (was hidden behind BottomNav)",
      "Admin changelog page at /admin/changelog",
    ],
  },
  {
    version: "v2.1.0",
    date: "18 May 2026",
    type: "minor",
    items: [
      "Quick Expense entry in QuickAdd modal",
      "Photo persistence via Backblaze B2 (fixed upload flow)",
      "Log Work entry links back to Tracker tab",
      "Dashboard widget toggles (show/hide per section)",
      "Edit project details from More tab",
    ],
  },
  {
    version: "v2.0.0",
    date: "17 May 2026",
    type: "major",
    items: [
      "Multi-user login & isolated accounts via Supabase Auth",
      "Setup wizard for new projects (3-step onboarding)",
      "Backblaze B2 cloud storage for photos",
      "Add reminders to phone calendar (ICS export)",
      "Display preferences per user",
      "RLS policies on all tables",
    ],
  },
  {
    version: "v1.0.0",
    date: "12 May 2026",
    type: "major",
    items: [
      "Unified financial summary on main dashboard",
      "Net Cash Balance banner (funds received − expenses paid)",
      "Reminders widget on dashboard",
      "QuickAdd FAB (log work, add expense, add funds, reminder, wish list, note)",
      "Lazy export (CSV/PDF)",
    ],
  },
  {
    version: "v0.1.0",
    date: "11 May 2026",
    type: "major",
    items: [
      "First release — phases & deliverables tracker",
      "Daily logs with photos",
      "Budget tracking (quoted vs actual)",
      "Deployed to vasudha-track.vercel.app",
    ],
  },
];

export default function AdminChangelogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Full Changelog</h1>
        <p className="text-xs text-gray-400 mt-1">Admin only · buildtrackapp.vercel.app</p>
      </div>

      {FULL_CHANGELOG.map(({ version, date, type, items }) => (
        <div key={version} className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${type === "major" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>
              {version}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${type === "major" ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"}`}>
              {type}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">{date}</span>
          </div>
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
