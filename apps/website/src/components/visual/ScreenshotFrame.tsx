import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function ScreenshotFrame({
  caption,
  children,
  className,
}: {
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("site-shot", className)}>
      {children}
      {caption ? <figcaption className="site-shot__caption">{caption}</figcaption> : null}
    </figure>
  );
}
