import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function StatCard({
  value,
  label,
  className,
  srValue,
}: {
  value: ReactNode;
  label: ReactNode;
  className?: string;
  srValue?: string;
}) {
  return (
    <div className={cn(className)}>
      <p className="font-mono text-lg font-semibold tabular-nums tracking-tight">
        {srValue ? <span className="sr-only">{srValue}</span> : null}
        <span aria-hidden={srValue ? true : undefined}>{value}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
