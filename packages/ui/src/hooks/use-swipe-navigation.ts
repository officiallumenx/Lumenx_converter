import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useIsMobile } from "./use-mobile";
import {
  getModuleNavDirection,
  MODULE_TRANSITION_EASE,
  MODULE_TRANSITION_MS,
  navigateWithModuleTransition,
} from "../page-transition";
import {
  defaultSwipeRouteActive,
  findSwipeNavIndex,
  getAdjacentSwipePath,
  isMoreHubPath,
  resolveSwipeNavSequence,
  type SwipeNavItem,
  type SwipeRouteActiveFn,
} from "../swipe-navigation";

const MIN_DISTANCE_PX = 64;
const MIN_VELOCITY = 0.35;
const HORIZONTAL_RATIO = 1.4;
const EDGE_RESISTANCE = 0.22;
const FIELD_IGNORE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[data-otp-input]",
  "[data-pin-input]",
  "[data-signature-pad]",
  "[data-swipe-nav-ignore]",
  "[role='tablist']",
  "[role='textbox']",
  "[role='searchbox']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='combobox']",
].join(",");

export type UseSwipeNavigationOptions = {
  containerRef: RefObject<HTMLElement | null>;
  pathname: string;
  primaryPaths: readonly SwipeNavItem[];
  morePaths?: readonly SwipeNavItem[];
  onNavigate: (path: string) => void;
  isActive?: SwipeRouteActiveFn;
  enabled?: boolean;
  settingsPath?: string;
  homePath?: string;
  /**
   * Called when the user swipes previous (right) from the first module.
   * When set, it replaces the Settings shortcut for that edge.
   */
  onSwipePrevFromFirst?: () => void;
};

function isHorizontallyScrollable(node: Element): boolean {
  if (!(node instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(node);
  if (!["auto", "scroll", "overlay"].includes(style.overflowX)) return false;
  return node.scrollWidth > node.clientWidth + 2;
}

function shouldBlockModuleSwipe(target: EventTarget | null, root: HTMLElement): boolean {
  if (document.documentElement.getAttribute("data-dashboard-editing") === "1") return true;
  if (!(target instanceof Element)) return true;
  const hit = target.closest(FIELD_IGNORE_SELECTOR);
  if (hit && root.contains(hit)) return true;

  let node: Element | null = target;
  while (node && root.contains(node)) {
    if (isHorizontallyScrollable(node)) return true;
    node = node.parentElement;
  }
  return false;
}

function getSurface(root: HTMLElement): HTMLElement {
  return (
    (root.querySelector(".lx-module-swipe-current") as HTMLElement | null) ??
    (root.querySelector(".lx-module-transition-root") as HTMLElement | null) ??
    ((root.firstElementChild as HTMLElement | null) ?? root)
  );
}

function resetSurface(surface: HTMLElement, animate: boolean) {
  surface.classList.remove("lx-module-swiping");
  const motion = `transform ${MODULE_TRANSITION_MS}ms ${MODULE_TRANSITION_EASE}`;
  surface.style.transition = animate ? motion : "none";
  surface.style.transform = "";
  surface.style.opacity = "";
  surface.style.borderRadius = "";
  surface.style.boxShadow = "";
  surface.style.filter = "";
  if (animate) {
    window.setTimeout(() => {
      surface.style.transition = "";
    }, MODULE_TRANSITION_MS + 30);
  } else {
    surface.style.transition = "";
  }
}

function applyLauncherDrag(surface: HTMLElement, dx: number, progress: number) {
  const scale = 1 - progress * 0.02;
  surface.classList.add("lx-module-swiping");
  surface.style.transition = "none";
  surface.style.transform = `translate3d(${dx}px, 0, 0) scale(${scale})`;
  surface.style.opacity = "";
  surface.style.borderRadius = "";
  surface.style.boxShadow = "";
}

/**
 * Swipe left → next; swipe right → previous.
 * Continuous primary → More pages (More hub skipped).
 * Lightweight drag feedback; navigates immediately on commit (no blank frames).
 */
export function useSwipeNavigation({
  containerRef,
  pathname,
  primaryPaths,
  morePaths,
  onNavigate,
  isActive = defaultSwipeRouteActive,
  enabled = true,
  settingsPath,
  homePath,
  onSwipePrevFromFirst,
}: UseSwipeNavigationOptions): void {
  const isMobile = useIsMobile();
  const pathnameRef = useRef(pathname);
  const primaryRef = useRef(primaryPaths);
  const moreRef = useRef(morePaths);
  const onNavigateRef = useRef(onNavigate);
  const isActiveRef = useRef(isActive);
  const swipeOn = enabled && isMobile;
  const enabledRef = useRef(swipeOn);
  const settingsPathRef = useRef(settingsPath);
  const homePathRef = useRef(homePath);
  const onSwipePrevFromFirstRef = useRef(onSwipePrevFromFirst);

  pathnameRef.current = pathname;
  primaryRef.current = primaryPaths;
  moreRef.current = morePaths;
  onNavigateRef.current = onNavigate;
  isActiveRef.current = isActive;
  enabledRef.current = swipeOn;
  settingsPathRef.current = settingsPath;
  homePathRef.current = homePath;
  onSwipePrevFromFirstRef.current = onSwipePrevFromFirst;

  const clearDragVisual = useCallback((el: HTMLElement) => {
    resetSurface(getSurface(el), true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!swipeOn) {
      resetSurface(getSurface(el), false);
      return;
    }

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    let locked: "h" | "v" | null = null;
    let lastX = 0;

    const onStart = (event: TouchEvent) => {
      if (!enabledRef.current) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;
      tracking = true;
      locked = null;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = startX;
      startTime = event.timeStamp;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || !enabledRef.current) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      lastX = touch.clientX;

      if (!locked) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (Math.abs(dy) >= Math.abs(dx) * HORIZONTAL_RATIO) {
          locked = "v";
          tracking = false;
          return;
        }
        if (Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO) {
          if (shouldBlockModuleSwipe(event.target, el)) {
            tracking = false;
            return;
          }
          locked = "h";
        } else {
          return;
        }
      }

      if (locked !== "h") return;
      if (event.cancelable) event.preventDefault();

      const sequence = resolveSwipeNavSequence(
        pathnameRef.current,
        primaryRef.current,
        moreRef.current,
        isActiveRef.current,
        settingsPathRef.current,
      );
      if (!sequence) return;

      const settings = onSwipePrevFromFirstRef.current
        ? undefined
        : settingsPathRef.current;
      const onSettingsShortcut =
        Boolean(settings && isActiveRef.current(pathnameRef.current, settings)) &&
        findSwipeNavIndex(pathnameRef.current, sequence, isActiveRef.current) < 0;
      const index = findSwipeNavIndex(
        pathnameRef.current,
        sequence,
        isActiveRef.current,
      );
      const moreItems = moreRef.current ?? [];
      const onExcludedHub = primaryRef.current.some(
        (item) =>
          isMoreHubPath(item.path, moreItems) &&
          isActiveRef.current(pathnameRef.current, item.path, item.exact),
      );
      const home = homePathRef.current ?? sequence[0]?.path ?? null;
      const canGoNext = onSettingsShortcut
        ? Boolean(home)
        : onExcludedHub
          ? sequence.length > 0
          : index >= 0 && index < sequence.length - 1;
      const canGoPrev = onSettingsShortcut
        ? false
        : onExcludedHub
          ? sequence.length > 0
          : index > 0 ||
            (index === 0 &&
              Boolean(settings || onSwipePrevFromFirstRef.current));

      let applyDx = dx;
      if ((dx > 0 && !canGoPrev) || (dx < 0 && !canGoNext)) {
        applyDx = dx * EDGE_RESISTANCE;
      }

      const surface = getSurface(el);
      const width = Math.max(el.clientWidth, 1);
      const progress = Math.min(1, Math.abs(applyDx) / width);
      applyLauncherDrag(surface, applyDx, progress);
    };

    const onEnd = (event: TouchEvent) => {
      if (!tracking) {
        tracking = false;
        locked = null;
        return;
      }

      const wasHorizontal = locked === "h";
      tracking = false;
      locked = null;

      if (!wasHorizontal || !enabledRef.current) {
        clearDragVisual(el);
        return;
      }

      const endX = event.changedTouches[0]?.clientX ?? lastX;
      const dx = endX - startX;
      const elapsed = Math.max(event.timeStamp - startTime, 1);
      const velocity = Math.abs(dx) / elapsed;
      const intentional =
        Math.abs(dx) >= MIN_DISTANCE_PX || (velocity >= MIN_VELOCITY && Math.abs(dx) >= 36);

      if (!intentional) {
        clearDragVisual(el);
        return;
      }

      const sequence = resolveSwipeNavSequence(
        pathnameRef.current,
        primaryRef.current,
        moreRef.current,
        isActiveRef.current,
        settingsPathRef.current,
      );
      if (!sequence) {
        clearDragVisual(el);
        return;
      }

      const direction: 1 | -1 = dx > 0 ? -1 : 1;
      const edgeMenu = onSwipePrevFromFirstRef.current;
      const target = getAdjacentSwipePath(
        pathnameRef.current,
        sequence,
        direction,
        isActiveRef.current,
        {
          settingsPath: edgeMenu ? undefined : settingsPathRef.current,
          homePath: homePathRef.current ?? sequence[0]?.path,
          primaryPaths: primaryRef.current,
          morePaths: moreRef.current,
        },
      );

      const surface = getSurface(el);
      if (!target || target === pathnameRef.current) {
        if (direction === -1 && edgeMenu) {
          const index = findSwipeNavIndex(
            pathnameRef.current,
            sequence,
            isActiveRef.current,
          );
          if (index === 0) {
            resetSurface(surface, true);
            edgeMenu();
            return;
          }
        }
        clearDragVisual(el);
        return;
      }

      const navDirection = getModuleNavDirection(
        pathnameRef.current,
        target,
        primaryRef.current,
        moreRef.current,
        {
          isActive: isActiveRef.current,
          settingsPath: settingsPathRef.current,
        },
      );

      resetSurface(surface, false);
      navigateWithModuleTransition(() => {
        onNavigateRef.current(target);
      }, navDirection === "none" ? (direction === 1 ? "forward" : "back") : navDirection);
    };

    const onCancel = () => {
      tracking = false;
      locked = null;
      clearDragVisual(el);
    };

    el.classList.add("lx-swipe-nav-region");

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      el.classList.remove("lx-swipe-nav-region");
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
      resetSurface(getSurface(el), false);
    };
  }, [clearDragVisual, containerRef, swipeOn]);
}
