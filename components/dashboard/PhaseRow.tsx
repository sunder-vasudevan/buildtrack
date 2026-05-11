import { Phase } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PhaseRow({ phase }: { phase: Phase }) {
  const progressMap: Record<string, number> = {
    "Not Started": 0,
    "In Progress": 50,
    Completed: 100,
    Delayed: 30,
  };
  const progress = progressMap[phase.status] ?? 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 truncate pr-2">{phase.name}</span>
        <StatusBadge status={phase.status} />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(phase.start_date)} — {formatDate(phase.end_date)}
      </p>
    </div>
  );
}
