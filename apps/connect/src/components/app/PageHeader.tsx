import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 max-w-full flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-semibold tracking-tight break-words sm:text-2xl md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl break-words text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {action}
        </div>
      )}
    </div>
  );
}
