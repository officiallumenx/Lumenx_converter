import { useRouterState } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode } from "react";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { getAdminModuleColor } from "@/lib/admin-module-colors";
import { useAdminMountTrace } from "@/hooks/useAdminPerformanceTrace";

export function AppShell({
  children,
  title,
  subtitle,
  titleActions,
  actions,
  mobileActions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Compact controls on the same line as the page title (e.g. Edit layout). */
  titleActions?: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const pageKey = `${path}::${title}`;
  const phoneActions = mobileActions ?? actions;
  const accent = getAdminModuleColor(path);
  useAdminMountTrace(`AppShell:${title}`);
  const accentStyle = {
    ["--lx-module-accent" as string]: accent.primary,
    ["--lx-module-chip" as string]: accent.iconBackground,
  } as CSSProperties;

  return (
    <div className="max-w-[1600px] mx-auto w-full" style={accentStyle}>
      <div key={pageKey} className="lx-page-header lx-page-header--enter mb-3 sm:mb-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="lx-page-title text-base font-semibold tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl line-clamp-2 sm:line-clamp-none">
                {subtitle}
              </p>
            )}
          </div>
          {titleActions ? (
            <div className="lx-page-title-actions shrink-0">{titleActions}</div>
          ) : null}
          {actions && <div className="lx-actions-bar shrink-0">{actions}</div>}
        </div>
      </div>
      <AdminPageTransition pageKey={pageKey}>{children}</AdminPageTransition>
      {phoneActions && (
        <>
          <div className="lx-mobile-actions-spacer sm:hidden" aria-hidden />
          <div className="lx-mobile-actions-bar sm:hidden">{phoneActions}</div>
        </>
      )}
    </div>
  );
}

