import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, daysLeft } from "@/lib/utils";
import { Building2, Users, BarChart3, Settings } from "lucide-react";

export default async function MorePage() {
  const { data: project } = await supabase.from("projects").select("*").single();

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900">More</h1>
      </div>

      {/* Project info */}
      {project && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border space-y-3">
          <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Project Info
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
      )}

      {/* Quick links */}
      <div className="space-y-2">
        <Link href="/vendors" className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-border">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm text-gray-900">Vendors</p>
            <p className="text-xs text-muted-foreground">Manage all vendors and payments</p>
          </div>
        </Link>
        <Link href="/phases" className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-border">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm text-gray-900">Phases</p>
            <p className="text-xs text-muted-foreground">Track construction phases</p>
          </div>
        </Link>
        <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-border opacity-50">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm text-gray-900">Reports & Export</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
