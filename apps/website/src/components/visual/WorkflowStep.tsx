import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { SiteCard } from "../SiteCard";

export function WorkflowStep({
  step,
  title,
  children,
  className,
}: {
  step: number | string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <SiteCard quiet className={cn(className)}>
      <p className="site-workflow-index">{step}</p>
      <p className="mt-3 font-semibold tracking-tight">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted-foreground">{children}</div> : null}
    </SiteCard>
  );
}
