export function StatCard({
  icon, label, value, sub, badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color?: string;
  badge?: { text: string; color: "red" | "green" | "gray" };
}) {
  const badgeColors = {
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      {badge && (
        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColors[badge.color]}`}>
          {badge.text}
        </span>
      )}
    </div>
  );
}
