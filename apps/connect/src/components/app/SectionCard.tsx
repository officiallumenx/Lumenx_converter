import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@lumenx/ui";

/** Reusable dashboard/section card with consistent paddings, shadow, height. */
export function SectionCard({
  title,
  link,
  linkLabel = "View all",
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  link?: string;
  linkLabel?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-2xl border border-border bg-card shadow-soft",
        "transition-[box-shadow,border-color,transform] duration-200 motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md",
        padded && "p-4 md:p-5",
        className,
      )}
    >
      {(title || link || action) && (
        <div className="mb-3 flex min-w-0 items-start justify-between gap-2 sm:items-center">
          {title && (
            <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug break-words line-clamp-2 sm:text-base">
              {title}
            </h3>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {link && (
              <Link
                to={link}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-primary hover:underline sm:text-xs"
              >
                {linkLabel} <ArrowRight className="size-3 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      )}
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
