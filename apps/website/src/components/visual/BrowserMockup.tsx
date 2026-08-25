import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function BrowserMockup({
  title = "LumenX",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("site-browser m-0", className)}>
      <div className="site-browser__bar" aria-hidden>
        <span className="site-browser__dot" />
        <span className="site-browser__dot" />
        <span className="site-browser__dot" />
        <span className="site-browser__title">{title}</span>
      </div>
      <div className="site-browser__screen">{children}</div>
    </figure>
  );
}
