import { useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { ModulePage } from "@/components/module-shell";
import { useAdminMountTrace } from "@/hooks/useAdminPerformanceTrace";

/** Home and Analytics already provide their own atmospheric shells. */
function shouldUseModuleShell(pathname: string): boolean {
  return pathname !== "/" && !pathname.startsWith("/analytics");
}

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
  useAdminMountTrace(`AppShell:${title}`);
  const useModuleShell = shouldUseModuleShell(path);
  const body = useModuleShell ? <ModulePage>{children}</ModulePage> : children;
  const showChromeTitle = !useModuleShell;
  const showActionsBar = Boolean(titleActions || actions);

  return (
    <div className="max-w-[1600px] mx-auto w-full">
      {showChromeTitle ? (
        <div key={pageKey} className="lx-page-header lx-page-header--enter mb-2 sm:mb-3">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="lx-page-title text-base font-semibold tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug max-w-3xl line-clamp-2 sm:line-clamp-none">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {titleActions ? (
              <div className="lx-page-title-actions shrink-0">{titleActions}</div>
            ) : null}
            {actions ? <div className="lx-actions-bar shrink-0">{actions}</div> : null}
          </div>
        </div>
      ) : showActionsBar ? (
        <div
          key={pageKey}
          className="lx-page-header lx-page-header--enter lx-page-header--actions-only mb-2 sm:mb-3"
        >
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {titleActions ? (
              <div className="lx-page-title-actions shrink-0">{titleActions}</div>
            ) : null}
            {actions ? <div className="lx-actions-bar shrink-0">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      <AdminPageTransition pageKey={pageKey}>{body}</AdminPageTransition>
      {phoneActions && (
        <>
          <div className="lx-mobile-actions-spacer sm:hidden" aria-hidden />
          <div className="lx-mobile-actions-bar sm:hidden">{phoneActions}</div>
        </>
      )}
    </div>
  );
}
