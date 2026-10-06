/**
 * Build pickup / drop stop sequences from route stops + enrollments.
 * Drop order follows configured drop_stop_id route_order — never coerce all drops to school.
 */

export type TripStopRef = {
  id: string;
  name: string;
  route_order: number;
  kind: "waypoint" | "school" | "parking" | string;
};

export type EnrollmentStopRef = {
  student_id: string;
  pickup_stop_id: string | null;
  drop_stop_id: string | null;
};

export function buildPickupStopSequence(stops: TripStopRef[]): TripStopRef[] {
  return stops
    .filter((s) => s.kind !== "parking")
    .slice()
    .sort((a, b) => {
      // Parking already excluded; school last for morning pickup runs.
      if (a.kind === "school" && b.kind !== "school") return 1;
      if (b.kind === "school" && a.kind !== "school") return -1;
      return a.route_order - b.route_order;
    });
}

/**
 * Drop sequence = unique drop stops (from enrollments), ordered by route_order.
 * If an enrollment has no drop_stop_id, fall back to school stop when present.
 * Does NOT reverse pickup blindly when drop stops are explicitly configured.
 */
export function buildDropStopSequence(
  stops: TripStopRef[],
  enrollments: EnrollmentStopRef[],
): TripStopRef[] {
  const byId = new Map(stops.map((s) => [s.id, s]));
  const school = stops.find((s) => s.kind === "school") ?? null;
  const dropIds = new Set<string>();

  for (const e of enrollments) {
    if (e.drop_stop_id && byId.has(e.drop_stop_id)) {
      dropIds.add(e.drop_stop_id);
      continue;
    }
    if (school) dropIds.add(school.id);
  }

  // If no enrollments supplied, use waypoints + school in reverse pickup order
  // (typical afternoon return when drop = pickup reverse).
  if (dropIds.size === 0) {
    const pickup = buildPickupStopSequence(stops).filter((s) => s.kind !== "school");
    return [...pickup].reverse();
  }

  return [...dropIds]
    .map((id) => byId.get(id)!)
    .filter(Boolean)
    .sort((a, b) => a.route_order - b.route_order);
}

/** Students expected at a given drop stop. */
export function studentsForDropStop(
  enrollments: EnrollmentStopRef[],
  dropStopId: string,
  schoolStopId: string | null,
): string[] {
  return enrollments
    .filter((e) => {
      const drop = e.drop_stop_id || schoolStopId;
      return drop === dropStopId;
    })
    .map((e) => e.student_id);
}

/** Students expected at a pickup stop. */
export function studentsForPickupStop(
  enrollments: EnrollmentStopRef[],
  pickupStopId: string,
): string[] {
  return enrollments
    .filter((e) => e.pickup_stop_id === pickupStopId)
    .map((e) => e.student_id);
}
