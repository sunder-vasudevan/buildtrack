import { supabase } from "@/lib/supabase";
import * as Tabs from "@radix-ui/react-tabs";
import { Project, Worker, Window } from "@/lib/types";
import { ProjectInfoTab } from "@/components/more/ProjectInfoTab";
import { TeamTab } from "@/components/more/TeamTab";
import { WindowsClient } from "@/components/tracker/WindowsTab";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const [projectRes, workersRes, windowsRes] = await Promise.all([
    supabase.from("projects").select("*").single(),
    supabase.from("workers").select("*").order("name"),
    supabase.from("windows").select("*").order("window_id"),
  ]);

  if (projectRes.error) console.error("Error fetching project:", projectRes.error);
  if (workersRes.error && workersRes.error.code !== "42P01") {
    console.error("Error fetching workers:", workersRes.error);
  }
  if (windowsRes.error) console.error("Error fetching windows:", windowsRes.error);

  const project = projectRes.data as Project | null;
  const workers = (workersRes.data ?? []) as Worker[];
  const windows = (windowsRes.data ?? []) as Window[];

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">More</h1>
      </div>

      <Tabs.Root defaultValue="project" className="flex flex-col flex-1 mt-2">
        <Tabs.List className="flex border-b border-border bg-white rounded-t-xl overflow-hidden shrink-0">
          <Tabs.Trigger
            value="project"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Project Info
          </Tabs.Trigger>
          <Tabs.Trigger
            value="team"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Team
          </Tabs.Trigger>
          <Tabs.Trigger
            value="windows"
            className="flex-1 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all"
          >
            Windows
          </Tabs.Trigger>
        </Tabs.List>

        <div className="flex-1 bg-white rounded-b-xl border-x border-b border-border overflow-y-auto p-4 mb-safe flex flex-col justify-between">
          <div>
            <Tabs.Content value="project" className="outline-none h-full">
              <ProjectInfoTab project={project} />
            </Tabs.Content>
            <Tabs.Content value="team" className="outline-none h-full">
              <TeamTab initialWorkers={workers} />
            </Tabs.Content>
            <Tabs.Content value="windows" className="outline-none h-full">
              <WindowsClient initialWindows={windows} />
            </Tabs.Content>
          </div>

          {/* Footer */}
          <div className="pt-8 pb-16 text-center space-y-1 shrink-0">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Vasudha Mobile Hub</p>
            <p className="text-xs text-muted-foreground">v1.2.0 · Built in Hyderabad with ❤️</p>
          </div>
        </div>
      </Tabs.Root>
    </div>
  );
}
