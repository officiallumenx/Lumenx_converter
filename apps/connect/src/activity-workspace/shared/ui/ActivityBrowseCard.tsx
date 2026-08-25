import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@lumenx/ui";

/** Tap target card for hierarchy / module browsing — sized to title + meta. */
export function ActivityBrowseCard({
  title,
  subtitle,
  meta,
  onClick,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-sm leading-snug">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
        {meta ? (
          <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {meta}
          </span>
        ) : null}
        {children}
      </span>
      {onClick ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </>
  );

  const classes = cn(
    "activity-browse-card flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-soft",
    onClick && "activity-list-row hover:border-primary/30 hover:bg-primary/[0.03]",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}
