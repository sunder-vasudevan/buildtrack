import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="pt-4 pb-2">
        <div className="h-6 w-32 bg-gray-200 rounded-md mb-2"></div>
        <div className="h-4 w-48 bg-gray-100 rounded-md"></div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-border h-24">
            <div className="h-4 w-20 bg-gray-100 rounded-md mb-2"></div>
            <div className="h-6 w-24 bg-gray-200 rounded-md mb-1"></div>
            <div className="h-3 w-16 bg-gray-100 rounded-md"></div>
          </div>
        ))}
      </div>
      
      {/* Centered Loader indicator */}
      <div className="flex justify-center py-4">
         <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    </div>
  );
}
