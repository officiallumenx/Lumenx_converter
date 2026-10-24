import type { ReactNode } from "react";
import { ModuleHelpControl } from "@/components/module-help/ModuleHelpControl";

/**
 * Compact hero band for Admin modules — visual only.
 * Owns the visible page title when AppShell hides chrome titles.
 * Optional helpKey shows the universal module-help info control.
 */
export function ModuleHero({
  eyebrow = "Module",
  title,
  subtitle,
  action,
  helpKey,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Registry id for module-help popup (e.g. "students", "send"). */
  helpKey?: string;
  /** Tighter padding / type for dense modules (e.g. Notifications). */
  compact?: boolean;
}) {
  const help = helpKey ? <ModuleHelpControl helpKey={helpKey} /> : null;
  const hasAction = Boolean(action || help);
  const sectionClass = [
    "lx-module-hero",
    compact ? "lx-module-hero--compact" : "",
    help ? "lx-module-hero--has-help" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass}>
      <div className="lx-module-hero__content">
        <p className="lx-module-hero__eyebrow">{eyebrow}</p>
        <h1 className="lx-module-hero__title">{title}</h1>
        {subtitle ? <p className="lx-module-hero__sub">{subtitle}</p> : null}
      </div>
      {hasAction ? (
        <div className="lx-module-hero__action">
          {action}
          {help}
        </div>
      ) : null}
    </section>
  );
}
