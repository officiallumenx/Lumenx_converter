import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@lumenx/ui";

export function CareersPageHeader({
  title,
  subtitle,
  backTo,
  action,
  className,
}: {
  title?: string;
  subtitle?: string;
  backTo?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 sm:mb-6", className)}>
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
      )}
      {(title || subtitle || action) && (
        <div className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            {title ? (
              <h1 className="font-display text-xl font-semibold tracking-tight break-words sm:text-2xl md:text-3xl">
                {title}
              </h1>
            ) : null}
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
      )}
    </div>
  );
}
