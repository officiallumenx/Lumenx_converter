import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { useReveal } from "./useReveal";

export function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("site-reveal", className)}>
      {children}
    </div>
  );
}
