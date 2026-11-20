import type { TripSlot } from "../trip/day-state";

export type AttendanceTabId = "boarding" | "dropping";

/**
 * Evening Drop trips must open on the Dropping tab. Defaulting to Boarding caused
 * drivers to enqueue boarding marks; End Trip then finalized unset drops as not_dropped.
 */
export function defaultAttendanceTabForSlot(
  slot: TripSlot | null | undefined,
): AttendanceTabId {
  return slot === "evening" ? "dropping" : "boarding";
}

/**
 * Resolve the stop id for a Drop mark.
 * Prefer enrollment drop stop; then enrollment pickup (home gate for afternoon when
 * drop_stop_id is unset); only then last route stop. Never invent "".
 *
 * Preferring last route stop first incorrectly labeled many drops as "School"
 * when enrollments lacked an explicit drop_stop_id.
 */
export function resolveDropStopIdForMark(input: {
  dropStopId?: string | null;
  pickupStopId?: string | null;
  routeStopIds: Array<string | null | undefined>;
}): string | null {
  const assigned = input.dropStopId?.trim();
  if (assigned) return assigned;
  const pickup = input.pickupStopId?.trim();
  if (pickup) return pickup;
  for (let i = input.routeStopIds.length - 1; i >= 0; i -= 1) {
    const id = input.routeStopIds[i]?.trim();
    if (id) return id;
  }
  return null;
}
