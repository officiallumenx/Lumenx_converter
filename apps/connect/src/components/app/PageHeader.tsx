import type { ReactNode } from "react";
import { ModuleHelpControl } from "@/components/module-help";

export function PageHeader({
  title,
  subtitle,
  action,
  helpKey,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Registry id for the module-help info popup (e.g. "attendance"). */
  helpKey?: string;
}) {
  const help = helpKey ? <ModuleHelpControl helpKey={helpKey} /> : null;
  const hasAction = Boolean(action || help);

  return (
    <div className="connect-page-header mb-5 flex min-w-0 max-w-full flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-xl font-semibold tracking-tight break-words sm:text-2xl md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl break-words text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {hasAction ? (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {action}
          {help}
        </div>
      ) : null}
    </div>
  );
}
