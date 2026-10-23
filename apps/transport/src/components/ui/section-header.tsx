import type { ElementType, ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { ModuleHelpControl } from "@/components/module-help";

export function SectionHeader({
  title,
  subtitle,
  action,
  helpKey,
  className,
  as: TitleTag = "h2",
  size = "section",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Registry id for the module-help info popup. */
  helpKey?: string;
  className?: string;
  as?: ElementType;
  size?: "page" | "section";
}) {
  const help = helpKey ? <ModuleHelpControl helpKey={helpKey} /> : null;
  const hasAction = Boolean(action || help);

  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <TitleTag
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            size === "page" && "text-xl sm:text-2xl",
            size === "section" && "text-lg",
          )}
        >
          {title}
        </TitleTag>
        {subtitle ? (
          <p
            className={cn(
              "leading-relaxed text-muted-foreground",
              size === "page" ? "mt-1.5 text-sm" : "mt-0.5 text-xs sm:text-sm",
            )}
          >
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
