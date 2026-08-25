/**
 * Configuration-driven horizontal swipe navigation helpers.
 * Path order is supplied by each app — never hardcoded here.
 */

export type SwipeNavItem = {
  /** Route path (same order as bottom nav / More list). */
  path: string;
  /** When true, only exact path matches (trailing slash allowed). */
  exact?: boolean;
};

export type SwipeRouteActiveFn = (
  pathname: string,
  path: string,
  exact?: boolean,
) => boolean;

export type SwipeAdjacentOptions = {
  /**
   * Existing Settings route used as virtual "-1" before the first module.
   * Not inserted into primary/more lists — swipe shortcut only.
   */
  settingsPath?: string;
  /**
   * Destination when swiping next (left) away from Settings when Settings
   * is not itself a real chain entry. Defaults to the first chain item.
   */
  homePath?: string;
};

/** Default pathname ↔ nav-item match (home exact; otherwise prefix). */
export function defaultSwipeRouteActive(
  pathname: string,
  path: string,
  exact?: boolean,
): boolean {
  if (exact || path === "/") {
    return pathname === path || pathname === `${path}/`;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** True when `hub` looks like a More hub for the given More pages (prefix parent). */
export function isMoreHubPath(hub: string, more: readonly SwipeNavItem[]): boolean {
  if (!more.length) return false;
  return more.every(
    (item) => item.path === hub || item.path.startsWith(`${hub}/`),
  );
}

/**
 * Continuous swipe chain: bottom-nav modules then More pages.
 * Skips More hub routes (e.g. `/more`) so swipe continues into More pages
 * without stopping on the hub/sheet.
 */
export function buildContinuousSwipeSequence(
  primary: readonly SwipeNavItem[],
  more?: readonly SwipeNavItem[],
): SwipeNavItem[] {
  const moreItems = more ?? [];
  const out: SwipeNavItem[] = [];
  const seen = new Set<string>();

  for (const item of primary) {
    if (seen.has(item.path)) continue;
    // Skip More hub — swipe goes straight into More pages.
    if (isMoreHubPath(item.path, moreItems)) continue;
    seen.add(item.path);
    out.push(item);
  }

  for (const item of moreItems) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    out.push(item);
  }

  return out;
}

export function findSwipeNavIndex(
  pathname: string,
  items: readonly SwipeNavItem[],
  isActive: SwipeRouteActiveFn = defaultSwipeRouteActive,
): number {
  // Prefer the most specific (longest) matching path so `/more/profile`
  // does not resolve to a parent hub `/more`.
  let best = -1;
  let bestLen = -1;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!isActive(pathname, item.path, item.exact)) continue;
    const len = item.path.length;
    if (len > bestLen) {
      best = i;
      bestLen = len;
    }
  }
  return best;
}

/**
 * Single continuous sequence across bottom nav + More pages (hub skipped).
 * If the user is currently on an excluded More hub route, still returns the chain
 * so they can swipe off the hub into adjacent modules.
 */
export function resolveSwipeNavSequence(
  pathname: string,
  primary: readonly SwipeNavItem[],
  more: readonly SwipeNavItem[] | undefined,
  isActive: SwipeRouteActiveFn = defaultSwipeRouteActive,
  settingsPath?: string,
): readonly SwipeNavItem[] | null {
  const moreItems = more ?? [];
  const chain = buildContinuousSwipeSequence(primary, moreItems);
  if (chain.length === 0) return null;

  if (settingsPath && isActive(pathname, settingsPath)) return chain;
  if (findSwipeNavIndex(pathname, chain, isActive) >= 0) return chain;

  const onExcludedHub = primary.some(
    (item) => isMoreHubPath(item.path, moreItems) && isActive(pathname, item.path, item.exact),
  );
  if (onExcludedHub) return chain;

  return null;
}

/**
 * Adjacent path in the continuous chain.
 * `direction: 1` = next (swipe left), `-1` = previous (swipe right).
 * No wrap-around. Settings is virtual -1 before the first module (shortcut only).
 * If parked on a skipped More hub, swipe continues into More pages / back to primary.
 */
export function getAdjacentSwipePath(
  pathname: string,
  items: readonly SwipeNavItem[],
  direction: 1 | -1,
  isActive: SwipeRouteActiveFn = defaultSwipeRouteActive,
  options?: SwipeAdjacentOptions & {
    primaryPaths?: readonly SwipeNavItem[];
    morePaths?: readonly SwipeNavItem[];
  },
): string | null {
  const settingsPath = options?.settingsPath;
  const homePath = options?.homePath ?? items[0]?.path ?? null;
  const moreItems = options?.morePaths ?? [];
  const primaryItems = options?.primaryPaths ?? [];

  // On excluded hub (e.g. /more): bridge between last primary and first More page
  const hub = primaryItems.find((item) => isMoreHubPath(item.path, moreItems));
  if (hub && isActive(pathname, hub.path, hub.exact)) {
    let primaryCount = 0;
    for (const p of primaryItems) {
      if (isMoreHubPath(p.path, moreItems)) break;
      if (items.some((c) => c.path === p.path)) primaryCount += 1;
    }
    if (direction === 1) return items[primaryCount]?.path ?? null;
    return items[primaryCount - 1]?.path ?? null;
  }

  const index = findSwipeNavIndex(pathname, items, isActive);

  if (index < 0) {
    if (settingsPath && isActive(pathname, settingsPath)) {
      if (direction === 1) return homePath;
      return null;
    }
    return null;
  }

  if (direction === -1 && index === 0 && settingsPath) {
    return settingsPath;
  }

  const next = index + direction;
  if (next < 0 || next >= items.length) return null;
  return items[next]?.path ?? null;
}

/** Map plain path strings into SwipeNavItem list (preserves order). */
export function toSwipeNavItems(
  paths: readonly string[],
  exactPaths?: ReadonlySet<string>,
): SwipeNavItem[] {
  return paths.map((path) => ({
    path,
    exact: exactPaths?.has(path) || path === "/" ? true : undefined,
  }));
}

/** @deprecated Sheet hubs are no longer inserted into the swipe chain. */
export const SWIPE_MORE_HUB_PATH = "__lumenx_more_hub__";
