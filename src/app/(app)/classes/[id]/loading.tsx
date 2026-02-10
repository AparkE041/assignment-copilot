import { Skeleton } from "@/components/ui/skeleton";

export default function ClassDetailLoading() {
  return (
    <div className="max-w-4xl space-y-8">
      {/* Back link */}
      <Skeleton className="h-6 w-32" />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      {/* Syllabus section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>

      {/* Assignments section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
