import { supabase } from "@/lib/supabase";
import { Project, Window, PlanDocument } from "@/lib/types";
import { ProjectInfoTab } from "@/components/more/ProjectInfoTab";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const [projectRes, windowsRes, documentsRes] = await Promise.all([
    supabase.from("projects").select("*").single(),
    supabase.from("windows").select("*").order("window_id"),
    supabase.from("documents").select("*").order("created_at", { ascending: false }),
  ]);

  if (projectRes.error) console.error("Error fetching project:", projectRes.error);
  if (windowsRes.error) console.error("Error fetching windows:", windowsRes.error);
  if (documentsRes.error) console.error("Error fetching documents:", documentsRes.error);

  const project = projectRes.data as Project | null;
  const windows = (windowsRes.data ?? []) as Window[];
  const plans = (documentsRes.data ?? []) as PlanDocument[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Project Info</h1>
      </div>

      <div className="flex-1 overflow-y-auto mb-safe">
        <ProjectInfoTab project={project} initialWindows={windows} initialPlans={plans} />

        {/* Footer */}
        <div className="pt-8 pb-16 text-center shrink-0">
          <p className="text-xs text-muted-foreground">v1.2.0 · Built in Hyderabad with ❤️</p>
        </div>
      </div>
    </div>
  );
}
