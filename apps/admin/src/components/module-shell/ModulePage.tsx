import type { CSSProperties, ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getAdminModuleColor } from "@/lib/admin-module-colors";

/**
 * Visual shell for Admin module pages (Home/Analytics language).
 * Presentation only — no data or navigation logic.
 */
export function ModulePage({
  children,
  className = "",
  accentPath,
}: {
  children: ReactNode;
  className?: string;
  /** Override pathname used for module accent (defaults to current route). */
  accentPath?: string;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const color = getAdminModuleColor(accentPath ?? path);
  const style = {
    ["--lx-module-accent" as string]: color.primary,
    ["--lx-module-chip" as string]: color.iconBackground,
  } as CSSProperties;

  return (
    <div className={`lx-module ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
