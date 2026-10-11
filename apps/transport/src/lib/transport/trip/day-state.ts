import type { TripPhase } from "./lifecycle";
import { isTripActive } from "./lifecycle";

export type TripSlot = "morning" | "evening";

export type DriverTripKind = "pickup" | "drop";

export type DriverHomeAction =
  | "loading"
  | "setup_route"
  | "add_stops"
  | "start_pickup"
  | "continue_pickup"
  | "start_drop"
  | "continue_drop"
  | "day_complete";

export type DriverTripDaySnapshot = {
  /** True once route-setup hydrate has finished for the current assignment. */
  routeHydrated: boolean;
  hasAssignedRoute: boolean;
  hasUsableStops: boolean;
  lockedByAdmin: boolean;
  routeSetupStatus: "not_configured" | "configured";
  phase: TripPhase;
  slot: TripSlot | null;
  morningCompletedToday: boolean;
  eveningCompletedToday: boolean;
};

export function tripKindForSlot(slot: TripSlot | null | undefined): DriverTripKind {
  return slot === "evening" ? "drop" : "pickup";
}

export function tripKindLabel(kind: DriverTripKind): string {
  return kind === "drop" ? "Drop" : "Pickup";
}

export function tripKindTitle(kind: DriverTripKind): string {
  return kind === "drop" ? "DROP TRIP" : "PICKUP TRIP";
}

/**
 * Authoritative next Home action from assignment + today's trip completion.
 * Does not invent trips; only interprets provided flags.
 */
export function deriveDriverHomeAction(
  snap: DriverTripDaySnapshot,
): DriverHomeAction {
  if (!snap.routeHydrated) return "loading";

  const tripActive = isTripActive(snap.phase);
  if (tripActive) {
    const kind = tripKindForSlot(snap.slot);
    return kind === "drop" ? "continue_drop" : "continue_pickup";
  }

  if (snap.eveningCompletedToday) return "day_complete";
  if (snap.phase === "completed" && snap.slot === "evening") {
    return "day_complete";
  }

  // Completed morning (API or just-ended local session) → Drop ready.
  // Wins over Setup Route so a brief empty stop snapshot cannot hide Drop.
  if (snap.morningCompletedToday) {
    return "start_drop";
  }

  // Truly no usable stops after hydrate → setup / add stops.
  // Never treat "not_configured" alone as setup when stops already exist.
  if (!snap.hasUsableStops) {
    if (snap.routeSetupStatus === "not_configured" && !snap.lockedByAdmin) {
      return "setup_route";
    }
    return "add_stops";
  }

  return "start_pickup";
}

/** Next slot to start when Home action is start_pickup / start_drop. */
export function nextStartSlot(action: DriverHomeAction): TripSlot | null {
  if (action === "start_pickup") return "morning";
  if (action === "start_drop") return "evening";
  return null;
}

export function homeActionPrimaryLabel(action: DriverHomeAction): string {
  switch (action) {
    case "loading":
      return "Loading…";
    case "setup_route":
      return "Set up route";
    case "add_stops":
      return "View stops";
    case "start_pickup":
      return "Start Pickup Trip";
    case "continue_pickup":
      return "Open current trip";
    case "start_drop":
      return "Start Drop Trip";
    case "continue_drop":
      return "Open current trip";
    case "day_complete":
      return "Trips complete for today";
    default:
      return "Start trip";
  }
}

export function homeActionHeadline(action: DriverHomeAction): {
  tripTitle: string;
  status: string;
} {
  switch (action) {
    case "loading":
      return { tripTitle: "TODAY'S TRIP", status: "Loading assignment…" };
    case "setup_route":
      return { tripTitle: "ROUTE SETUP", status: "Stops required before trips" };
    case "add_stops":
      return { tripTitle: "ROUTE SETUP", status: "Add at least one stop" };
    case "start_pickup":
      return { tripTitle: "PICKUP TRIP", status: "Ready to start" };
    case "continue_pickup":
      return { tripTitle: "PICKUP TRIP", status: "In progress" };
    case "start_drop":
      return { tripTitle: "DROP TRIP", status: "Ready to start" };
    case "continue_drop":
      return { tripTitle: "DROP TRIP", status: "In progress" };
    case "day_complete":
      return { tripTitle: "TODAY'S TRIPS", status: "All trips completed" };
    default:
      return { tripTitle: "TODAY'S TRIP", status: "Ready" };
  }
}

export function isCompletedPhase(phase: string): boolean {
  return phase === "completed";
}
