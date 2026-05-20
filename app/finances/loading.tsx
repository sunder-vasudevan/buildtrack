export default function FinancesLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="pt-4 pb-2">
        <div className="h-6 w-24 bg-gray-200 rounded-md" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-border shadow-sm h-16" />
      ))}
      <div className="h-32 bg-gray-100 rounded-xl" />
      <div className="h-32 bg-gray-100 rounded-xl" />
    </div>
  );
}
