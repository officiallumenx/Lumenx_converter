import type { ReactNode } from "react";

/**
 * Compact hero band for Admin modules — visual only.
 * Owns the visible page title when AppShell hides chrome titles.
 */
export function ModuleHero({
  eyebrow = "Module",
  title,
  subtitle,
  action,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Tighter padding / type for dense modules (e.g. Notifications). */
  compact?: boolean;
}) {
  return (
    <section className={`lx-module-hero${compact ? " lx-module-hero--compact" : ""}`}>
      <div className="lx-module-hero__content">
        <p className="lx-module-hero__eyebrow">{eyebrow}</p>
        <h1 className="lx-module-hero__title">{title}</h1>
        {subtitle ? <p className="lx-module-hero__sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="lx-module-hero__action">{action}</div> : null}
      <div className="lx-module-hero__art" aria-hidden>
        <span className="lx-module-hero__orb lx-module-hero__orb--a" />
        <span className="lx-module-hero__orb lx-module-hero__orb--b" />
        <span className="lx-module-hero__orb lx-module-hero__orb--c" />
      </div>
    </section>
  );
}
