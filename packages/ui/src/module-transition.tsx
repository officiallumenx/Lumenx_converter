import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "./lib/utils";
import "./page-transition.css";
import {
  getModuleNavDirection,
  MODULE_TRANSITION_MS,
  type ModuleTransitionDirection,
} from "./page-transition";
import {
  defaultSwipeRouteActive,
  type SwipeNavItem,
  type SwipeRouteActiveFn,
} from "./swipe-navigation";

const ENTER_CLASSES = ["lx-module-enter-forward", "lx-module-enter-back"] as const;

export type ModuleTransitionRootProps = {
  pathname: string;
  primaryPaths: readonly SwipeNavItem[];
  morePaths?: readonly SwipeNavItem[];
  settingsPath?: string;
  isActive?: SwipeRouteActiveFn;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** When false, skip enter animation (e.g. desktop). */
  enabled?: boolean;
};

function clearInlineMotion(node: HTMLElement) {
  node.style.transform = "";
  node.style.opacity = "";
  node.style.transition = "";
  node.style.borderRadius = "";
  node.style.boxShadow = "";
  node.style.filter = "";
  node.classList.remove("lx-module-swiping", ...ENTER_CLASSES);
}

/**
 * Directional slide enter applied in the same layout pass as the route change
 * so the first painted frame is already animating (no identity-frame blink).
 */
export function ModuleTransitionRoot({
  pathname,
  primaryPaths,
  morePaths,
  settingsPath,
  isActive = defaultSwipeRouteActive,
  className,
  style,
  children,
  enabled = true,
}: ModuleTransitionRootProps) {
  const prevPathRef = useRef(pathname);
  const rootRef = useRef<HTMLDivElement>(null);
  const sequenceKey = useMemo(
    () =>
      `${primaryPaths.map((p) => p.path).join("|")}::${(morePaths ?? []).map((p) => p.path).join("|")}`,
    [primaryPaths, morePaths],
  );

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const prev = prevPathRef.current;
    if (!enabled || prev === pathname) {
      prevPathRef.current = pathname;
      clearInlineMotion(node);
      return;
    }

    const direction: ModuleTransitionDirection = getModuleNavDirection(
      prev,
      pathname,
      primaryPaths,
      morePaths,
      { isActive, settingsPath },
    );

    prevPathRef.current = pathname;
    clearInlineMotion(node);

    if (direction === "none") return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      delete document.documentElement.dataset.lxNavDir;
      return;
    }

    void node.offsetWidth;
    node.classList.add(direction === "back" ? "lx-module-enter-back" : "lx-module-enter-forward");

    const timer = window.setTimeout(() => {
      node.classList.remove(...ENTER_CLASSES);
      delete document.documentElement.dataset.lxNavDir;
    }, MODULE_TRANSITION_MS + 40);
    return () => window.clearTimeout(timer);
  }, [pathname, enabled, primaryPaths, morePaths, settingsPath, isActive, sequenceKey]);

  return (
    <div
      ref={rootRef}
      className={cn("lx-module-transition-root lx-module-swipe-current", className)}
      style={style}
      data-lx-module-page=""
    >
      {children}
    </div>
  );
}
