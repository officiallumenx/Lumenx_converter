import { Skeleton, cn } from "@lumenx/ui";

type LoadingVariant = "page" | "list" | "spinner" | "inline";

export function Loading({
  variant = "page",
  rows = 4,
  className,
  label = "Loading",
}: {
  variant?: LoadingVariant;
  rows?: number;
  className?: string;
  label?: string;
}) {
  if (variant === "spinner" || variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 text-muted-foreground",
          variant === "inline" ? "py-2" : "min-h-40",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <span
          className="size-5 animate-spin rounded-full border-2 border-primary border-r-transparent"
          aria-hidden
        />
        {variant === "inline" ? <span className="text-sm">{label}</span> : null}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-label={label}>
        <Skeleton className="h-11 w-full rounded-xl" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} aria-busy="true" aria-label={label}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-[var(--width-auth)] rounded-md" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}
