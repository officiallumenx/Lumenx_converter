import { Skeleton } from "@lumenx/ui";

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in">
      <Skeleton className="h-8 w-2/3 max-w-sm" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="grid gap-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
