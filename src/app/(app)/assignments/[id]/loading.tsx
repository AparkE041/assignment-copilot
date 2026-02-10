import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Back link */}
      <Skeleton className="h-6 w-32" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-xl" />
        ))}
      </div>

      {/* Tab content */}
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
