/**
 * Phase 8 — durable offline ops outbox for Driver Transport.
 * Only operationally necessary events: GPS, boarding, drop, trip lifecycle, emergency.
 * Not a full offline database.
 */

import {
  createTransportEmergency,
  endTransportTrip,
  markTripBoarding,
  markTripDropping,
  pingTripLocation,
  startTransportTrip,
  updateTransportTripPhase,
} from "@/lib/transport-api";

export type OpsEventType =
  | "gps"
  | "boarding"
  | "not_boarded"
  | "drop"
  | "not_dropped"
  | "trip_start"
  | "trip_phase"
  | "trip_end"
  | "emergency";

export type OpsOutboxStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "conflict";

export type OpsOutboxEvent = {
  clientEventId: string;
  eventType: OpsEventType;
  tripId: string | null;
  studentId: string | null;
  stopId: string | null;
  capturedAt: string;
  sequence: number;
  payload: Record<string, unknown>;
  retryCount: number;
  status: OpsOutboxStatus;
  lastError?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
};

export type OpsOutboxSnapshot = {
  events: OpsOutboxEvent[];
  pendingCount: number;
  online: boolean;
  lastError: string | null;
  lastGpsUploadedAt: string | null;
  lastConflictMessage: string | null;
};

export type OpsOutboxEnqueueInput = {
  eventType: OpsEventType;
  tripId?: string | null;
  studentId?: string | null;
  stopId?: string | null;
  capturedAt?: string;
  /** Stable id across retries — generated if omitted. */
  clientEventId?: string;
  payload: Record<string, unknown>;
};

type Listener = () => void;

const STORAGE_KEY = "lumenx.transport.ops-outbox.v1";
const MAX_RETRIES = 12;
const BACKOFF_MS = [2_000, 5_000, 10_000, 20_000, 30_000, 60_000] as const;
/** GPS coalescing only — never applied to boarding/drop/SOS/lifecycle. */
const GPS_KEEP_MIN_INTERVAL_MS = 2_500;
const GPS_MAX_PER_TRIP = 480;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

/** Events that put tripId in the URL path — non-UUIDs always 400 Path validation. */
function eventNeedsUuidTripId(eventType: OpsEventType): boolean {
  return (
    eventType === "gps" ||
    eventType === "boarding" ||
    eventType === "not_boarded" ||
    eventType === "drop" ||
    eventType === "not_dropped" ||
    eventType === "trip_phase" ||
    eventType === "trip_end"
  );
}

function isPoisonTripPathEvent(event: OpsOutboxEvent): boolean {
  if (!eventNeedsUuidTripId(event.eventType)) return false;
  if (!event.tripId) return true;
  return !isUuid(event.tripId);
}

function dropPoisonTripPathEvents(): boolean {
  const before = events.length;
  events = events.filter((e) => !isPoisonTripPathEvent(e));
  return events.length !== before;
}

const CRITICAL_EVENT_TYPES = new Set<OpsEventType>([
  "boarding",
  "not_boarded",
  "drop",
  "not_dropped",
  "trip_start",
  "trip_phase",
  "trip_end",
  "emergency",
]);

export function isCriticalOpsEvent(eventType: OpsEventType): boolean {
  return CRITICAL_EVENT_TYPES.has(eventType);
}

/**
 * GPS may be coalesced for long offline periods.
 * Always keep latest per trip, first sample, and ~2–3s movement history.
 * Critical events are never dropped.
 */
export function coalesceOpsEventsForPersist(
  all: OpsOutboxEvent[],
): OpsOutboxEvent[] {
  const unsent = all.filter((e) => e.status !== "sent");
  const critical = unsent.filter((e) => isCriticalOpsEvent(e.eventType));
  const gps = unsent.filter((e) => e.eventType === "gps");
  const other = unsent.filter(
    (e) => e.eventType !== "gps" && !isCriticalOpsEvent(e.eventType),
  );

  const gpsKept: OpsOutboxEvent[] = [];
  const byTrip = new Map<string, OpsOutboxEvent[]>();
  for (const e of gps) {
    const key = e.tripId ?? "_";
    const list = byTrip.get(key) ?? [];
    list.push(e);
    byTrip.set(key, list);
  }
  for (const list of byTrip.values()) {
    list.sort((a, b) => a.sequence - b.sequence);
    const kept: OpsOutboxEvent[] = [];
    for (const sample of list) {
      if (kept.length === 0) {
        kept.push(sample);
        continue;
      }
      const prev = kept[kept.length - 1]!;
      const prevAt = Date.parse(prev.capturedAt);
      const nextAt = Date.parse(sample.capturedAt);
      if (
        Number.isFinite(prevAt) &&
        Number.isFinite(nextAt) &&
        nextAt - prevAt >= GPS_KEEP_MIN_INTERVAL_MS
      ) {
        kept.push(sample);
      } else if (sample === list[list.length - 1]) {
        kept[kept.length - 1] = sample;
      }
    }
    const last = list[list.length - 1];
    if (last && kept[kept.length - 1]?.clientEventId !== last.clientEventId) {
      kept.push(last);
    }
    gpsKept.push(
      ...(kept.length > GPS_MAX_PER_TRIP
        ? [kept[0]!, ...kept.slice(-(GPS_MAX_PER_TRIP - 1))]
        : kept),
    );
  }

  return [...critical, ...other, ...gpsKept].sort(
    (a, b) => a.sequence - b.sequence,
  );
}

const listeners = new Set<Listener>();
let events: OpsOutboxEvent[] = [];
let globalSequence = 0;
let lastError: string | null = null;
let lastGpsUploadedAt: string | null = null;
let lastConflictMessage: string | null = null;
let online = typeof navigator === "undefined" ? true : navigator.onLine;
let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let hydrated = false;

function uid(prefix = "ops"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof localStorage === "undefined") return;
  const payload = {
    events: coalesceOpsEventsForPersist(events),
    globalSequence,
    lastGpsUploadedAt,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota: drop GPS first, never critical events.
    try {
      const criticalOnly = payload.events.filter((e) =>
        isCriticalOpsEvent(e.eventType),
      );
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...payload, events: criticalOnly }),
      );
    } catch {
      /* keep memory */
    }
  }
}

function hydrate() {
  if (hydrated || typeof localStorage === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        events?: OpsOutboxEvent[];
        globalSequence?: number;
        lastGpsUploadedAt?: string | null;
      };
      events = Array.isArray(parsed.events) ? parsed.events : [];
      globalSequence = Number(parsed.globalSequence) || 0;
      lastGpsUploadedAt = parsed.lastGpsUploadedAt ?? null;
      if (dropPoisonTripPathEvents()) {
        if (lastError?.toLowerCase().includes("path parameter")) {
          lastError = null;
        }
        persist();
      }
    }

    // One-time migrate legacy GPS-only outbox so in-flight points are not lost.
    const legacyRaw = localStorage.getItem("lumenx.transport.gps-outbox.v1");
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as {
          events?: Array<{
            clientEventId: string;
            tripId: string;
            capturedAt: string;
            latitude: number;
            longitude: number;
            accuracyM: number | null;
            sequenceNumber: number;
            status: string;
            retryCount: number;
            createdAt: string;
            lastError?: string | null;
            nextRetryAt?: string | null;
          }>;
          lastSentAt?: string | null;
        };
        if (!lastGpsUploadedAt && legacy.lastSentAt) {
          lastGpsUploadedAt = legacy.lastSentAt;
        }
        for (const e of legacy.events ?? []) {
          if (e.status === "sent") continue;
          if (events.some((x) => x.clientEventId === e.clientEventId)) continue;
          events.push({
            clientEventId: e.clientEventId,
            eventType: "gps",
            tripId: e.tripId,
            studentId: null,
            stopId: null,
            capturedAt: e.capturedAt,
            sequence: e.sequenceNumber || globalSequence + 1,
            payload: {
              latitude: e.latitude,
              longitude: e.longitude,
              accuracyM: e.accuracyM,
            },
            retryCount: e.retryCount ?? 0,
            status: e.status === "failed" ? "failed" : "pending",
            lastError: e.lastError ?? null,
            nextRetryAt: e.nextRetryAt ?? null,
            createdAt: e.createdAt || new Date().toISOString(),
          });
          globalSequence = Math.max(globalSequence, e.sequenceNumber || 0);
        }
        localStorage.removeItem("lumenx.transport.gps-outbox.v1");
        persist();
      } catch {
        /* ignore legacy parse */
      }
    }
  } catch {
    events = [];
  }
}

function nextBackoffMs(retryCount: number): number {
  return BACKOFF_MS[Math.min(retryCount, BACKOFF_MS.length - 1)]!;
}

function nextSequence(): number {
  globalSequence += 1;
  return globalSequence;
}

export function subscribeOpsOutbox(listener: Listener): () => void {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOpsOutboxSnapshot(): OpsOutboxSnapshot {
  hydrate();
  const pending = events.filter((e) => e.status !== "sent");
  return {
    events: pending,
    pendingCount: pending.length,
    online,
    lastError,
    lastGpsUploadedAt,
    lastConflictMessage,
  };
}

export function isOpsOutboxOnline(): boolean {
  return online;
}

function scheduleFlush(delayMs = 0) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushOpsOutbox();
  }, delayMs);
}

export function enqueueOpsEvent(input: OpsOutboxEnqueueInput): OpsOutboxEvent {
  hydrate();
  const event: OpsOutboxEvent = {
    clientEventId: input.clientEventId?.trim() || uid(input.eventType),
    eventType: input.eventType,
    tripId: input.tripId ?? null,
    studentId: input.studentId ?? null,
    stopId: input.stopId ?? null,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    sequence: nextSequence(),
    payload: input.payload,
    retryCount: 0,
    status: "pending",
    lastError: null,
    nextRetryAt: null,
    createdAt: new Date().toISOString(),
  };
  // Never queue events that will 400 on `/trips/:id/...` path params.
  if (isPoisonTripPathEvent(event)) {
    return { ...event, status: "sent", lastError: "Dropped invalid trip id" };
  }
  events.push(event);
  persist();
  emit();
  scheduleFlush(online ? 0 : 250);
  return event;
}

function markEvent(
  clientEventId: string,
  patch: Partial<OpsOutboxEvent>,
) {
  const idx = events.findIndex((e) => e.clientEventId === clientEventId);
  if (idx < 0) return;
  events[idx] = { ...events[idx]!, ...patch };
}

function actionableConflictMessage(err: unknown, eventType: OpsEventType): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("conflict") || lower.includes("409")) {
    if (eventType === "boarding" || eventType === "not_boarded") {
      return "Server already has a boarding mark for this student. Showing server state.";
    }
    if (eventType === "drop" || eventType === "not_dropped") {
      return "Server already has a drop mark for this student. Showing server state.";
    }
    if (eventType === "emergency") {
      return "An emergency is already open on this bus. Showing server state.";
    }
    if (eventType === "trip_start") {
      return "A trip is already active for this bus. Showing server trip.";
    }
    if (eventType === "trip_end") {
      return "Trip was already completed on the server.";
    }
    return `Server state differs: ${message}`;
  }
  return message;
}

function isConflictError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return (
    lower.includes("conflict") ||
    lower.includes("already") ||
    lower.includes("409") ||
    lower.includes("client_event_id already")
  );
}

async function dispatchEvent(event: OpsOutboxEvent): Promise<void> {
  const p = event.payload;
  switch (event.eventType) {
    case "gps": {
      if (!event.tripId) throw new Error("GPS event missing trip_id");
      await pingTripLocation(event.tripId, {
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        accuracyM: (p.accuracyM as number | null | undefined) ?? null,
        capturedAt: event.capturedAt,
        clientEventId: event.clientEventId,
        sequenceNumber: event.sequence,
      });
      lastGpsUploadedAt = new Date().toISOString();
      return;
    }
    case "boarding":
    case "not_boarded": {
      if (!event.tripId || !event.studentId || !event.stopId) {
        throw new Error("Boarding event missing trip/student/stop");
      }
      await markTripBoarding(event.tripId, {
        studentId: event.studentId,
        stopId: event.stopId,
        boardingStatus: event.eventType === "boarding" ? "boarded" : "not_boarded",
        clientEventId: event.clientEventId,
      });
      return;
    }
    case "drop":
    case "not_dropped": {
      if (!event.tripId || !event.studentId || !event.stopId) {
        throw new Error("Drop event missing trip/student/stop");
      }
      await markTripDropping(event.tripId, {
        studentId: event.studentId,
        stopId: event.stopId,
        droppingStatus: event.eventType === "drop" ? "dropped" : "not_dropped",
        clientEventId: event.clientEventId,
      });
      return;
    }
    case "trip_start": {
      await startTransportTrip({
        instituteId: String(p.instituteId),
        routeId: String(p.routeId),
        vehicleId: String(p.vehicleId),
        driverId: String(p.driverId),
        tripDate: p.tripDate ? String(p.tripDate) : undefined,
        clientEventId: event.clientEventId,
      });
      return;
    }
    case "trip_phase": {
      if (!event.tripId) throw new Error("Phase event missing trip_id");
      await updateTransportTripPhase(event.tripId, {
        phase: p.phase as "running" | "boarding" | "dropping" | "starting" | "ready" | "completed",
        currentStopIndex:
          typeof p.currentStopIndex === "number" ? p.currentStopIndex : undefined,
        currentStopId:
          p.currentStopId === null
            ? null
            : p.currentStopId
              ? String(p.currentStopId)
              : undefined,
        clientEventId: event.clientEventId,
      });
      return;
    }
    case "trip_end": {
      if (!event.tripId) throw new Error("End event missing trip_id");
      await endTransportTrip(event.tripId, event.clientEventId);
      return;
    }
    case "emergency": {
      await createTransportEmergency({
        instituteId: String(p.instituteId),
        tripId: (p.tripId as string | null | undefined) ?? event.tripId,
        driverId: String(p.driverId),
        vehicleId: String(p.vehicleId),
        note: (p.note as string | null | undefined) ?? null,
        latitude: (p.latitude as number | null | undefined) ?? null,
        longitude: (p.longitude as number | null | undefined) ?? null,
        clientEventId: event.clientEventId,
      });
      return;
    }
    default:
      throw new Error(`Unknown event type: ${event.eventType}`);
  }
}

export async function flushOpsOutbox(): Promise<void> {
  hydrate();
  if (flushing) return;
  flushing = true;
  try {
    if (dropPoisonTripPathEvents()) {
      if (lastError?.toLowerCase().includes("path parameter")) {
        lastError = null;
      }
      persist();
      emit();
    }

    if (!online) {
      lastError = "Offline — changes will sync when connection returns.";
      emit();
      return;
    }

    const now = Date.now();
    const due = events
      .filter((e) => e.status === "pending" || e.status === "failed")
      .filter((e) => !e.nextRetryAt || Date.parse(e.nextRetryAt) <= now)
      .sort((a, b) => a.sequence - b.sequence);

    for (const event of due) {
      markEvent(event.clientEventId, { status: "sending" });
      emit();
      try {
        await dispatchEvent(event);
        markEvent(event.clientEventId, {
          status: "sent",
          lastError: null,
          nextRetryAt: null,
        });
        lastError = null;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lumenx-transport-ops-confirmed", {
              detail: {
                clientEventId: event.clientEventId,
                eventType: event.eventType,
                studentId: event.studentId,
                tripId: event.tripId,
              },
            }),
          );
        }
      } catch (err) {
        if (isConflictError(err)) {
          // Server wins — treat as reconciled, never silently overwrite.
          const msg = actionableConflictMessage(err, event.eventType);
          lastConflictMessage = msg;
          markEvent(event.clientEventId, {
            status: "sent",
            lastError: msg,
            nextRetryAt: null,
          });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("lumenx-transport-ops-conflict", {
                detail: {
                  clientEventId: event.clientEventId,
                  eventType: event.eventType,
                  studentId: event.studentId,
                  message: msg,
                },
              }),
            );
          }
          continue;
        }

        const message = actionableConflictMessage(err, event.eventType);
        const retryCount = event.retryCount + 1;
        const giveUp = retryCount >= MAX_RETRIES;
        markEvent(event.clientEventId, {
          status: "failed",
          retryCount,
          lastError: message,
          nextRetryAt: giveUp
            ? null
            : new Date(Date.now() + nextBackoffMs(retryCount)).toISOString(),
        });
        lastError = message;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lumenx-transport-ops-failed", {
              detail: {
                clientEventId: event.clientEventId,
                eventType: event.eventType,
                studentId: event.studentId,
                message,
                giveUp,
              },
            }),
          );
        }
        // Preserve ordering — stop on first hard failure wave.
        if (!giveUp) scheduleFlush(nextBackoffMs(retryCount));
        break;
      }
    }

    events = events.filter((e) => e.status !== "sent");
    persist();
    emit();
  } finally {
    flushing = false;
  }
}

export function retryFailedOpsEvent(clientEventId: string): void {
  hydrate();
  const idx = events.findIndex((e) => e.clientEventId === clientEventId);
  if (idx < 0) return;
  events[idx] = {
    ...events[idx]!,
    status: "pending",
    nextRetryAt: null,
  };
  persist();
  emit();
  scheduleFlush(0);
}

export function retryFailedStudentEvents(studentId: string): void {
  hydrate();
  let changed = false;
  events = events.map((e) => {
    if (e.studentId === studentId && e.status === "failed") {
      changed = true;
      return { ...e, status: "pending" as const, nextRetryAt: null };
    }
    return e;
  });
  if (changed) {
    persist();
    emit();
    scheduleFlush(0);
  }
}

/** Test helper — replace in-memory queue. */
export function __resetOpsOutboxForTests(seed?: {
  events?: OpsOutboxEvent[];
  online?: boolean;
  lastGpsUploadedAt?: string | null;
}): void {
  events = seed?.events ? [...seed.events] : [];
  online = seed?.online ?? true;
  lastError = null;
  lastConflictMessage = null;
  lastGpsUploadedAt = seed?.lastGpsUploadedAt ?? null;
  globalSequence = events.reduce((max, e) => Math.max(max, e.sequence), 0);
  hydrated = true;
  persist();
  emit();
}

if (typeof window !== "undefined") {
  hydrate();
  window.addEventListener("online", () => {
    online = true;
    lastError = null;
    emit();
    scheduleFlush(0);
  });
  window.addEventListener("offline", () => {
    online = false;
    lastError = "Offline — changes will sync when connection returns.";
    emit();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleFlush(0);
  });
}
