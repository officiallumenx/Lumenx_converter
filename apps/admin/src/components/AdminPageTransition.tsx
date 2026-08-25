import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { PageLoadingSkeleton } from "@lumenx/ui-admin";

export function AdminPageTransition({
  children,
  pageKey,
}: {
  children: ReactNode;
  pageKey: string;
}) {
  const busy = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const swipePaging = Boolean(document.documentElement.dataset.lxNavDir);
    if (!busy || swipePaging) {
      setShowSkeleton(false);
      return;
    }
    const t = window.setTimeout(() => setShowSkeleton(true), 320);
    return () => window.clearTimeout(t);
  }, [busy, pageKey]);

  return (
    <div className="relative min-h-[12rem]" aria-busy={showSkeleton || undefined}>
      <div
        className={`lx-page-skeleton-layer ${showSkeleton ? "lx-page-skeleton-layer--visible" : ""}`}
        aria-hidden={!showSkeleton}
      >
        <PageLoadingSkeleton />
      </div>
      <div key={pageKey} className="lx-page-content">
        {children}
      </div>
    </div>
  );
}
