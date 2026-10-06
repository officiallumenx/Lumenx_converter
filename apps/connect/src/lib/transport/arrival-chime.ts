import { playNotificationChime } from "@lumenx/notifications";
import type { ParentTransportStatus } from "./parent-status";

const STORAGE_PREFIX = "lx.connect.transport.arrival-chime";

/**
 * Soft foreground chime once per trip when the relevant stop arrival occurs.
 * Push in background is handled by FCM / platform notification rules.
 */
export function maybePlayArrivalChime(input: {
  studentId: string;
  tripId: string | null | undefined;
  status: ParentTransportStatus | null | undefined;
}): void {
  if (input.status !== "arrived") return;
  if (typeof sessionStorage === "undefined") return;
  const tripKey = input.tripId?.trim() || "no-trip";
  const key = `${STORAGE_PREFIX}:${input.studentId}:${tripKey}`;
  try {
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Private mode / quota — still play once this session via memory fallthrough.
  }
  playNotificationChime();
}
