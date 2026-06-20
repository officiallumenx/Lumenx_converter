import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { PageLoadingSkeleton } from "@lumenx/ui-admin";

export function AdminPageTransition({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  const busy = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (busy) {
      setEntering(false);
      return;
    }
    setEntering(true);
    const t = window.setTimeout(() => setEntering(false), 520);
    return () => window.clearTimeout(t);
  }, [busy, pageKey]);

  const contentClass = [
    "lx-page-content",
    busy ? "lx-page-content--loading" : "",
    entering ? "lx-page-content--enter" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="relative min-h-[12rem]" aria-busy={busy || undefined}>
      <div className={`lx-page-skeleton-layer ${busy ? "lx-page-skeleton-layer--visible" : ""}`} aria-hidden={!busy}>
        <PageLoadingSkeleton />
      </div>
      <div key={pageKey} className={contentClass}>
        {children}
      </div>
    </div>
  );
}
