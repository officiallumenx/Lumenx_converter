import type { ReactNode } from "react";
import { ModuleHelpControl } from "@/components/module-help";

/** Consistent in-page section title for hierarchy and ops screens. */
export function ActivitySectionHeader({
  title,
  subtitle,
  action,
  helpKey,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Registry id for the module-help info popup. */
  helpKey?: string;
}) {
  const help = helpKey ? <ModuleHelpControl helpKey={helpKey} /> : null;
  const hasAction = Boolean(action || help);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>
      {hasAction ? (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {help}
        </div>
      ) : null}
    </div>
  );
}
