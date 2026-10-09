import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { PageLoadingSkeleton } from "@lumenx/ui-admin";

/**
 * Soft page chrome during slow route transitions.
 * Must NOT remount `{children}` on every pageKey — that destroyed query-backed
 * UI state and forced full-page loading on every navigation.
 */
export function AdminPageTransition({
  children,
  pageKey,
}: {
  children: ReactNode;
  pageKey: string;
}) {
  const busy = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [showSkeleton, setShowSkeleton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const swipePaging = Boolean(document.documentElement.dataset.lxNavDir);
    if (!busy || swipePaging) {
      setShowSkeleton(false);
      return;
    }
    const t = window.setTimeout(() => setShowSkeleton(true), 320);
    return () => window.clearTimeout(t);
  }, [busy, pageKey]);

  // Replay enter animation without remounting the route tree / Query observers.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    node.classList.remove("lx-page-content--enter");
    // Force reflow so the class can re-trigger CSS animation.
    void node.offsetWidth;
    node.classList.add("lx-page-content--enter");
  }, [pageKey]);

  return (
    <div className="relative min-h-[12rem]" aria-busy={showSkeleton || undefined}>
      <div
        className={`lx-page-skeleton-layer ${showSkeleton ? "lx-page-skeleton-layer--visible" : ""}`}
        aria-hidden={!showSkeleton}
      >
        <PageLoadingSkeleton />
      </div>
      <div ref={contentRef} className="lx-page-content" data-page-key={pageKey}>
        {children}
      </div>
    </div>
  );
}
