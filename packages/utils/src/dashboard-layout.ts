/**
 * Persist customizable dashboard widget order + visibility.
 * Keys should include app + portal + institute scope where applicable.
 */

export type DashboardLayoutState = {
  version: 1;
  /** Widget ids in display order (includes hidden). */
  order: string[];
  /** Ids currently hidden from the home view. */
  hidden: string[];
};

const PREFIX = "lumenx.dashboard.layout.v1";

function normalize(
  state: DashboardLayoutState | null,
  defaultOrder: readonly string[],
): DashboardLayoutState {
  const defaults = [...defaultOrder];
  if (!state || !Array.isArray(state.order)) {
    return { version: 1, order: defaults, hidden: [] };
  }
  const known = new Set(defaults);
  const order = state.order.filter((id) => known.has(id));
  for (const [index, id] of defaults.entries()) {
    if (!order.includes(id)) order.splice(Math.min(index, order.length), 0, id);
  }
  const hidden = (state.hidden ?? []).filter((id) => known.has(id));
  return { version: 1, order, hidden };
}

export function loadDashboardLayout(
  storageKey: string,
  defaultOrder: readonly string[],
): DashboardLayoutState {
  if (typeof localStorage === "undefined") {
    return { version: 1, order: [...defaultOrder], hidden: [] };
  }
  try {
    const raw = localStorage.getItem(`${PREFIX}.${storageKey}`);
    if (!raw) return { version: 1, order: [...defaultOrder], hidden: [] };
    return normalize(JSON.parse(raw) as DashboardLayoutState, defaultOrder);
  } catch {
    return { version: 1, order: [...defaultOrder], hidden: [] };
  }
}

export function saveDashboardLayout(storageKey: string, state: DashboardLayoutState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${PREFIX}.${storageKey}`, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

export function resetDashboardLayout(
  storageKey: string,
  defaultOrder: readonly string[],
): DashboardLayoutState {
  const next: DashboardLayoutState = {
    version: 1,
    order: [...defaultOrder],
    hidden: [],
  };
  saveDashboardLayout(storageKey, next);
  return next;
}

export function visibleDashboardOrder(state: DashboardLayoutState): string[] {
  const hidden = new Set(state.hidden);
  return state.order.filter((id) => !hidden.has(id));
}

export function moveDashboardWidget(
  state: DashboardLayoutState,
  fromId: string,
  toId: string,
): DashboardLayoutState {
  if (fromId === toId) return state;
  const order = [...state.order];
  const from = order.indexOf(fromId);
  const to = order.indexOf(toId);
  if (from < 0 || to < 0) return state;
  order.splice(from, 1);
  order.splice(to, 0, fromId);
  return { ...state, order };
}

/** Swap one step up (-1) or down (+1) in the full order list. */
export function moveDashboardWidgetByDelta(
  state: DashboardLayoutState,
  id: string,
  delta: -1 | 1,
): DashboardLayoutState {
  const order = [...state.order];
  const from = order.indexOf(id);
  if (from < 0) return state;
  const to = from + delta;
  if (to < 0 || to >= order.length) return state;
  const tmp = order[from]!;
  order[from] = order[to]!;
  order[to] = tmp;
  return { ...state, order };
}

export function hideDashboardWidget(
  state: DashboardLayoutState,
  id: string,
): DashboardLayoutState {
  if (state.hidden.includes(id)) return state;
  return { ...state, hidden: [...state.hidden, id] };
}

export function showDashboardWidget(
  state: DashboardLayoutState,
  id: string,
): DashboardLayoutState {
  return { ...state, hidden: state.hidden.filter((h) => h !== id) };
}
