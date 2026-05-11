export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Not Started": "bg-gray-100 text-gray-600",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Delayed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
