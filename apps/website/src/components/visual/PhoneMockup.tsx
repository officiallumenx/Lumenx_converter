import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function PhoneMockup({
  title,
  children,
  className,
  compact = false,
  size = "md",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <figure
      className={cn(
        "site-phone m-0",
        compact && "site-phone--compact",
        size === "sm" && "site-phone--sm",
        className,
      )}
    >
      {title ? (
        <figcaption className="mb-2 px-1 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </figcaption>
      ) : null}
      <div className="site-phone__shell">
        <div className="site-phone__notch" aria-hidden />
        <div className="site-phone__screen">{children}</div>
      </div>
    </figure>
  );
}
