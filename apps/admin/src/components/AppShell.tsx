import { useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { AdminPageTransition } from "@/components/AdminPageTransition";

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const pageKey = `${path}::${title}`;

  return (
    <div className="max-w-[1600px] mx-auto w-full">
      <div key={pageKey} className="lx-page-header lx-page-header--enter">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-7">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold tracking-tight leading-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">{subtitle}</p>}
          </div>
          {actions && (
            <div className="lx-actions-bar hidden sm:flex">{actions}</div>
          )}
        </div>
      </div>
      <AdminPageTransition pageKey={pageKey}>
        {children}
      </AdminPageTransition>
      {actions && (
        <>
          <div className="lx-mobile-actions-spacer sm:hidden" aria-hidden />
          <div className="lx-mobile-actions-bar sm:hidden">
            {actions}
          </div>
        </>
      )}
    </div>
  );
}
