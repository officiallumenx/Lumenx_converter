import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function TabletMockup({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("site-tablet m-0", className)}>
      {title ? (
        <figcaption className="mb-2 px-1 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </figcaption>
      ) : null}
      <div className="site-tablet__shell">
        <div className="site-tablet__screen">{children}</div>
      </div>
    </figure>
  );
}
