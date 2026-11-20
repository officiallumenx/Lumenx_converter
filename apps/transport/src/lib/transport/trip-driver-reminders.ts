/**
 * Driver trip activity reminders (Issue 7).
 *
 * Native LocalNotifications while a trip is active:
 * - every 10 minutes for up to 1 hour
 * - actionable Continue / End when the platform supports actions
 *
 * Does NOT silently end the trip at the one-hour boundary (safety policy).
 * Continues leave the trip active; End routes the driver into the in-app end flow.
 */

import { isTripActive } from "./trip/lifecycle";
import { getTripSessionSnapshot } from "./trip/store";

/** Public policy constants (Issue 7) — unit-tested without native plugins. */
export const TRIP_DRIVER_REMINDER_INTERVAL_MS = 10 * 60_000;
export const TRIP_DRIVER_REMINDER_MAX_MS = 60 * 60_000;
export const TRIP_DRIVER_REMINDER_ACTION_CONTINUE = "trip_continue";
export const TRIP_DRIVER_REMINDER_ACTION_END = "trip_end";

const REMINDER_INTERVAL_MS = TRIP_DRIVER_REMINDER_INTERVAL_MS;
const REMINDER_MAX_MS = TRIP_DRIVER_REMINDER_MAX_MS;
const CHANNEL_ID = "lumenx-transport-trip";
const ACTION_CONTINUE = TRIP_DRIVER_REMINDER_ACTION_CONTINUE;
const ACTION_END = TRIP_DRIVER_REMINDER_ACTION_END;
const NOTIFICATION_ID_BASE = 71001;

/** True when elapsed trip time has reached the one-hour reminder ceiling. */
export function isTripDriverReminderHourBoundary(
  elapsedMs: number,
  maxMs: number = TRIP_DRIVER_REMINDER_MAX_MS,
): boolean {
  return Number.isFinite(elapsedMs) && elapsedMs > maxMs;
}

/**
 * Map local-notification action ids to client handling.
 * Continue / tap never silently end the trip; End only requests the in-app end flow.
 */
export function resolveTripDriverReminderAction(
  actionId: string,
): "continue" | "end_request" | "open_only" | "ignore" {
  if (actionId === ACTION_CONTINUE) return "continue";
  if (actionId === ACTION_END) return "end_request";
  if (actionId === "tap") return "open_only";
  return "ignore";
}

export function reminderActionSilentlyEndsTrip(actionId: string): boolean {
  // Policy: no action auto-completes the trip.
  void actionId;
  return false;
}

let startedAtMs: number | null = null;
let reminderTimer: ReturnType<typeof setInterval> | null = null;
let reminderIndex = 0;
let listenersAttached = false;
let tripIdForReminders: string | null = null;

function canUseNativeNotifications(): boolean {
  try {
    return typeof window !== "undefined" && !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

async function ensureChannel(): Promise<void> {
  if (!canUseNativeNotifications()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Active trip",
      description: "Reminders while a transport trip is running",
      importance: 4,
      visibility: 1,
    });
  } catch {
    /* channel may already exist / web */
  }
}

async function scheduleOneReminder(index: number): Promise<void> {
  if (!canUseNativeNotifications()) return;
  const trip = getTripSessionSnapshot();
  if (!trip.tripId || !isTripActive(trip.phase)) return;
  if (startedAtMs != null && Date.now() - startedAtMs > REMINDER_MAX_MS) {
    await notifyHourBoundary(trip.tripId);
    stopTripDriverReminders();
    return;
  }

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID_BASE + index,
          title: "Trip still active",
          body: "Tracking may pause in the background. Continue the trip or end it when finished.",
          channelId: CHANNEL_ID,
          extra: {
            tripId: trip.tripId,
            action: "trip_reminder",
          },
          actionTypeId: "TRIP_REMINDER_ACTIONS",
        },
      ],
    });
  } catch {
    /* permission denied / unsupported */
  }
}

async function notifyHourBoundary(tripId: string): Promise<void> {
  if (!canUseNativeNotifications()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID_BASE + 99,
          title: "Trip still open — confirm status",
          body: "One hour has passed without a response. The trip was NOT ended automatically. Open Transport to continue or end the trip.",
          channelId: CHANNEL_ID,
          extra: { tripId, action: "trip_hour_boundary" },
          actionTypeId: "TRIP_REMINDER_ACTIONS",
        },
      ],
    });
  } catch {
    /* ignore */
  }
}

async function registerActionTypes(): Promise<void> {
  if (!canUseNativeNotifications()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: "TRIP_REMINDER_ACTIONS",
          actions: [
            { id: ACTION_CONTINUE, title: "Continue trip" },
            { id: ACTION_END, title: "End trip", destructive: true },
          ],
        },
      ],
    });
  } catch {
    /* older Capacitor / web */
  }
}

function attachActionListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  void (async () => {
    if (!canUseNativeNotifications()) return;
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (event) => {
          const actionId = event.actionId;
          const extra = (event.notification.extra ?? {}) as {
            tripId?: string;
          };
          const trip = getTripSessionSnapshot();
          if (
            extra.tripId &&
            trip.tripId &&
            extra.tripId !== trip.tripId
          ) {
            return;
          }
          if (actionId === ACTION_END || actionId === "tap") {
            if (actionId === ACTION_END) {
              window.dispatchEvent(
                new CustomEvent("lumenx-transport-driver-end-trip-request", {
                  detail: { tripId: trip.tripId, source: "local_notification" },
                }),
              );
            }
            // Continue / tap: open app; trip stays active (no silent end).
            return;
          }
          if (actionId === ACTION_CONTINUE) {
            window.dispatchEvent(
              new CustomEvent("lumenx-transport-driver-continue-trip", {
                detail: { tripId: trip.tripId, source: "local_notification" },
              }),
            );
          }
        },
      );
    } catch {
      /* ignore */
    }
  })();
}

/** Start 10-minute reminders for up to 1 hour while the trip is active. */
export async function startTripDriverReminders(): Promise<void> {
  stopTripDriverReminders();
  const trip = getTripSessionSnapshot();
  if (!trip.tripId || !isTripActive(trip.phase)) return;
  tripIdForReminders = trip.tripId;
  startedAtMs = Date.now();
  reminderIndex = 0;
  await ensureChannel();
  await registerActionTypes();
  attachActionListeners();
  // First reminder after 10 minutes (not immediately at start).
  reminderTimer = setInterval(() => {
    reminderIndex += 1;
    void scheduleOneReminder(reminderIndex);
  }, REMINDER_INTERVAL_MS);
}

export function stopTripDriverReminders(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
  startedAtMs = null;
  tripIdForReminders = null;
  reminderIndex = 0;
  if (canUseNativeNotifications()) {
    void import("@capacitor/local-notifications")
      .then(({ LocalNotifications }) =>
        LocalNotifications.cancel({
          notifications: Array.from({ length: 12 }, (_, i) => ({
            id: NOTIFICATION_ID_BASE + i,
          })).concat([{ id: NOTIFICATION_ID_BASE + 99 }]),
        }),
      )
      .catch(() => undefined);
  }
}

export function getTripDriverReminderDebugState(): {
  active: boolean;
  tripId: string | null;
  startedAtMs: number | null;
} {
  return {
    active: reminderTimer != null,
    tripId: tripIdForReminders,
    startedAtMs,
  };
}
