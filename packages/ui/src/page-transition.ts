/**
 * Shared top-level module page transitions (directional slide + light fade).
 * CSS-enter only — View Transitions were glitchy inside scroll containers.
 */

import {
  buildContinuousSwipeSequence,
  findSwipeNavIndex,
  type SwipeNavItem,
  type SwipeRouteActiveFn,
  defaultSwipeRouteActive,
} from "./swipe-navigation";

export type ModuleTransitionDirection = "forward" | "back" | "none";

export const MODULE_TRANSITION_MS = 340;
export const MODULE_TRANSITION_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

let lastDirection: ModuleTransitionDirection = "forward";
const listeners = new Set<() => void>();

export function getModuleTransitionDirection(): ModuleTransitionDirection {
  return lastDirection;
}

export function setModuleTransitionDirection(direction: ModuleTransitionDirection): void {
  lastDirection = direction;
  if (typeof document !== "undefined") {
    if (direction === "none") {
      delete document.documentElement.dataset.lxNavDir;
    } else {
      document.documentElement.dataset.lxNavDir = direction;
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribeModuleTransition(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getModuleNavDirection(
  fromPathname: string,
  toPathname: string,
  primary: readonly SwipeNavItem[],
  more?: readonly SwipeNavItem[],
  options?: {
    isActive?: SwipeRouteActiveFn;
    settingsPath?: string;
  },
): ModuleTransitionDirection {
  if (fromPathname === toPathname) return "none";
  const isActive = options?.isActive ?? defaultSwipeRouteActive;
  const chain = buildContinuousSwipeSequence(primary, more);
  if (chain.length < 2) return "forward";

  const fromIdx = findSwipeNavIndex(fromPathname, chain, isActive);
  const toIdx = findSwipeNavIndex(toPathname, chain, isActive);

  if (options?.settingsPath) {
    const onFromSettings = isActive(fromPathname, options.settingsPath);
    const onToSettings = isActive(toPathname, options.settingsPath);
    if (onToSettings && fromIdx === 0) return "back";
    if (onFromSettings && toIdx === 0) return "forward";
  }

  if (fromIdx < 0 || toIdx < 0) return "forward";
  if (toIdx === fromIdx) return "none";
  return toIdx > fromIdx ? "forward" : "back";
}

/** Set direction then navigate immediately (enter animation runs on the new page). */
export function navigateWithModuleTransition(
  navigate: () => void,
  direction: ModuleTransitionDirection = "forward",
): void {
  if (direction !== "none") {
    setModuleTransitionDirection(direction);
  }
  navigate();
}
