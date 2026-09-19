/**
 * Canonical Transport TanStack Query keys.
 * Always include instituteId (and driverId / vehicleId where scoped).
 */

export const transportQueryRoots = {
  assignment: "transport",
  inbox: "transport",
  emergency: "transport",
  roster: "transport",
} as const;

export const transportQueryKeys = {
  assignment: (instituteId: string, driverId: string) =>
    ["transport", "assignment", instituteId, driverId] as const,
  inbox: (instituteId: string) => ["transport", "inbox", instituteId] as const,
  emergency: (instituteId: string, vehicleId = "_") =>
    ["transport", "emergency", instituteId, vehicleId] as const,
  roster: (instituteId: string) => ["transport", "roster", instituteId] as const,
};

/** Roots invalidated on Transport soft refresh for the active session. */
export const TRANSPORT_SOFT_REFRESH_ROOTS = ["transport"] as const;
