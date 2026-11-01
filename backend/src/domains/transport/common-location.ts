/**
 * Common student transport location helpers.
 * Product rule: one location for pickup and drop.
 * Legacy rows may still have diverging pickup_stop_id / drop_stop_id — map safely.
 */

export type StopPair = {
  pickupStopId: string | null | undefined;
  dropStopId: string | null | undefined;
};

/** Prefer pickup when set; else drop. Does not invent a stop. */
export function resolveCommonLocationStopId(pair: StopPair): string | null {
  const pickup = typeof pair.pickupStopId === "string" ? pair.pickupStopId.trim() : "";
  if (pickup) return pickup;
  const drop = typeof pair.dropStopId === "string" ? pair.dropStopId.trim() : "";
  return drop || null;
}

/** True when both sides are set and disagree (needs reconciliation awareness). */
export function hasConflictingPickupDrop(pair: StopPair): boolean {
  const pickup = typeof pair.pickupStopId === "string" ? pair.pickupStopId.trim() : "";
  const drop = typeof pair.dropStopId === "string" ? pair.dropStopId.trim() : "";
  return Boolean(pickup && drop && pickup !== drop);
}

/**
 * Dual-write target for Manage Location / common-location saves.
 * Always sets both pickup and drop to the same stop id.
 */
export function commonLocationWritePair(stopId: string): {
  pickupStopId: string;
  dropStopId: string;
} {
  const id = stopId.trim();
  return { pickupStopId: id, dropStopId: id };
}
