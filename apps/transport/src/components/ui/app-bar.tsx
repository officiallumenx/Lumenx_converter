import * as React from "react";
import { cn } from "@lumenx/ui";

export interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  sticky?: boolean;
}

/** Top app chrome — matches Connect header rhythm for Transport. */
export function AppBar({
  title,
  subtitle,
  leading,
  actions,
  sticky = true,
  className,
  ...props
}: AppBarProps) {
  return (
    <header
      className={cn(
        "z-40 border-b border-border bg-card/95 backdrop-blur-md",
        sticky && "sticky top-0",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex min-h-14 max-w-[720px] items-center gap-3 px-4 py-2.5 sm:px-5">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>
    </header>
  );
}
