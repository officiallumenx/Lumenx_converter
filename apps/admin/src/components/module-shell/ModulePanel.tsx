import type { ReactNode } from "react";

/**
 * Tinted panel shell matching Home panels — visual only.
 */
export function ModulePanel({
  children,
  className = "",
  title,
  hint,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  hint?: string;
  action?: ReactNode;
}) {
  const showHead = Boolean(title || hint || action);
  return (
    <section className={`lx-module-panel ${className}`.trim()}>
      {showHead ? (
        <div className="lx-module-panel__head">
          <div className="min-w-0">
            {title ? <h3 className="lx-module-panel__title">{title}</h3> : null}
            {hint ? <p className="lx-module-panel__hint">{hint}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
