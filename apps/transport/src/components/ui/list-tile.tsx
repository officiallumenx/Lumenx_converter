import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@lumenx/ui";

export interface ListTileProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
  disabled?: boolean;
}

/** Large tap target row for driver lists — Connect-aligned motion. */
export function ListTile({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  showChevron = Boolean(onClick),
  className,
  disabled,
}: ListTileProps) {
  const interactive = Boolean(onClick) && !disabled;
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={interactive ? disabled : undefined}
      className={cn(
        "transport-list-row flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-soft",
        interactive &&
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "opacity-50",
        className,
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {showChevron ? (
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground opacity-60 transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </Comp>
  );
}
