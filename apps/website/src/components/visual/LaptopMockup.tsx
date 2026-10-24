import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function LaptopMockup({
  title,
  children,
  className,
  compact = false,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <figure className={cn("site-laptop m-0", compact && "site-laptop--compact", className)}>
      {title ? (
        <figcaption className="mb-2 px-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </figcaption>
      ) : null}
      <div className="site-laptop__body">
        <div className="site-laptop__lid">
          <div className="site-laptop__bezel">
            <div className="site-laptop__camera" aria-hidden />
            <div className="site-laptop__screen">{children}</div>
          </div>
        </div>
        <div className="site-laptop__base" aria-hidden>
          <div className="site-laptop__notch" />
        </div>
      </div>
    </figure>
  );
}
