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
    <div className={cn("mb-6", className)}>
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
      )}
      {(title || subtitle || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            ) : null}
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
    </div>
  );
}
