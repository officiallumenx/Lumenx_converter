import { Skeleton } from "@lumenx/ui";

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-w-0 space-y-6 animate-pulse">
      <Skeleton className="h-36 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
      ))}
    </div>
  );
}
