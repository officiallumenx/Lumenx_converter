/**
 * Shared Transport Emergency store (Admin ↔ Driver, localStorage demo).
 * Frontend workflow only — no SMS, push, or calls.
 *
 * Lifecycle: SOS confirmed → active → acknowledged → resolved → history
 */

export const TRANSPORT_EMERGENCY_STORAGE_KEY = "lumenx.transport.emergencies.v1";
export const TRANSPORT_EMERGENCY_CHANGED_EVENT = "lumenx-transport-emergency-updated";

export type TransportEmergencyStatus = "active" | "acknowledged" | "resolved";

export type TransportEmergencyType =
  | "general"
  | "breakdown"
  | "medical"
  | "accident"
  | "delay"
  | "route_issue"
  | "other";

export type TransportEmergencyTimelineEvent = {
  id: string;
  at: string;
  label: string;
  note?: string;
};

export type TransportEmergency = {
  id: string;
  type: TransportEmergencyType;
  status: TransportEmergencyStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveNote: string | null;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeCode: string;
  routeName: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  timeline: TransportEmergencyTimelineEvent[];
};

export type TransportEmergencySnapshot = {
  emergencies: TransportEmergency[];
};

export type CreateTransportEmergencyInput = {
  type?: TransportEmergencyType;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeCode: string;
  routeName: string;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
};

export type CreateTransportEmergencyResult =
  | { ok: true; created: true; emergency: TransportEmergency }
  | { ok: false; created: false; emergency: TransportEmergency; reason: string };

function emptySnapshot(): TransportEmergencySnapshot {
  return { emergencies: [] };
}

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

/** Cached list snapshots for useSyncExternalStore (stable until mutate / cross-tab storage). */
let cachedAllList: TransportEmergency[] | null = null;
let cachedActiveList: TransportEmergency[] | null = null;
let cachedResolvedList: TransportEmergency[] | null = null;

function invalidateEmergencyListCache(): void {
  cachedAllList = null;
  cachedActiveList = null;
  cachedResolvedList = null;
}

function emitChanged() {
  invalidateEmergencyListCache();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRANSPORT_EMERGENCY_CHANGED_EVENT));
}

export function isEmergencyOpen(status: TransportEmergencyStatus): boolean {
  return status === "active" || status === "acknowledged";
}

function normalizeEmergency(raw: Partial<TransportEmergency> & { id: string }): TransportEmergency {
  const status: TransportEmergencyStatus =
    raw.status === "acknowledged" || raw.status === "resolved" || raw.status === "active"
      ? raw.status
      : "active";
  return {
    id: raw.id,
    type: raw.type ?? "general",
    status,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    acknowledgedAt: raw.acknowledgedAt ?? null,
    acknowledgedBy: raw.acknowledgedBy ?? null,
    resolvedAt: raw.resolvedAt ?? null,
    resolvedBy: raw.resolvedBy ?? null,
    resolveNote: raw.resolveNote ?? null,
    driverId: raw.driverId ?? "",
    driverName: raw.driverName ?? "—",
    vehicleId: raw.vehicleId ?? "",
    vehicleNumber: raw.vehicleNumber ?? "—",
    routeCode: raw.routeCode ?? "—",
    routeName: raw.routeName ?? "—",
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    note: raw.note ?? null,
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
  };
}

function seedEmergencies(): TransportEmergencySnapshot {
  return {
    emergencies: [
      {
        id: "SOS-101",
        type: "breakdown",
        status: "resolved",
        createdAt: "2026-07-21T07:42:00.000Z",
        acknowledgedAt: "2026-07-21T07:45:00.000Z",
        acknowledgedBy: "Admin",
        resolvedAt: "2026-07-21T08:15:00.000Z",
        resolvedBy: "Admin",
        resolveNote: "Spare bus dispatched. Original vehicle returned to depot.",
        driverId: "DRV-01",
        driverName: "Ravi Kumar",
        vehicleId: "VH-01",
        vehicleNumber: "BUS-01",
        routeCode: "NCL",
        routeName: "North Campus Loop",
        latitude: 28.7041,
        longitude: 77.1025,
        note: null,
        timeline: [
          {
            id: "ev-101-1",
            at: "2026-07-21T07:42:00.000Z",
            label: "SOS confirmed",
            note: "Driver triggered emergency from Transport app",
          },
          {
            id: "ev-101-2",
            at: "2026-07-21T07:43:00.000Z",
            label: "Emergency created",
          },
          {
            id: "ev-101-ack",
            at: "2026-07-21T07:45:00.000Z",
            label: "Acknowledged",
            note: "Admin reviewing case",
          },
          {
            id: "ev-101-3",
            at: "2026-07-21T08:15:00.000Z",
            label: "Resolved",
            note: "Spare bus dispatched. Original vehicle returned to depot.",
          },
        ],
      },
      {
        id: "SOS-099",
        type: "medical",
        status: "resolved",
        createdAt: "2026-07-20T15:50:00.000Z",
        acknowledgedAt: "2026-07-20T15:55:00.000Z",
        acknowledgedBy: "Admin",
        resolvedAt: "2026-07-20T16:20:00.000Z",
        resolvedBy: "Admin",
        resolveNote: "Student assisted; trip completed with relief driver.",
        driverId: "DRV-02",
        driverName: "Suresh Patel",
        vehicleId: "VH-02",
        vehicleNumber: "BUS-02",
        routeCode: "CCE",
        routeName: "City Center Express",
        latitude: null,
        longitude: null,
        note: null,
        timeline: [
          {
            id: "ev-099-1",
            at: "2026-07-20T15:50:00.000Z",
            label: "SOS confirmed",
          },
          {
            id: "ev-099-2",
            at: "2026-07-20T15:51:00.000Z",
            label: "Emergency created",
          },
          {
            id: "ev-099-ack",
            at: "2026-07-20T15:55:00.000Z",
            label: "Acknowledged",
          },
          {
            id: "ev-099-3",
            at: "2026-07-20T16:20:00.000Z",
            label: "Resolved",
            note: "Student assisted; trip completed with relief driver.",
          },
        ],
      },
    ],
  };
}

export function loadTransportEmergencies(): TransportEmergencySnapshot {
  if (!canUseStorage()) return seedEmergencies();
  try {
    const raw = localStorage.getItem(TRANSPORT_EMERGENCY_STORAGE_KEY);
    if (!raw) {
      const seed = seedEmergencies();
      localStorage.setItem(TRANSPORT_EMERGENCY_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as TransportEmergencySnapshot;
    const emergencies = Array.isArray(parsed.emergencies)
      ? parsed.emergencies.map((e) => normalizeEmergency(e))
      : [];
    return { emergencies };
  } catch {
    return seedEmergencies();
  }
}

export function saveTransportEmergencies(snapshot: TransportEmergencySnapshot): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(TRANSPORT_EMERGENCY_STORAGE_KEY, JSON.stringify(snapshot));
    emitChanged();
  } catch {
    // ignore quota
  }
}

export function listTransportEmergencies(): TransportEmergency[] {
  if (!cachedAllList) {
    cachedAllList = [...loadTransportEmergencies().emergencies].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  return cachedAllList;
}

/** Open desk cases: newly raised or acknowledged (not yet resolved). */
export function listActiveTransportEmergencies(): TransportEmergency[] {
  if (!cachedActiveList) {
    cachedActiveList = listTransportEmergencies().filter((e) => isEmergencyOpen(e.status));
  }
  return cachedActiveList;
}

export function listResolvedTransportEmergencies(): TransportEmergency[] {
  if (!cachedResolvedList) {
    cachedResolvedList = listTransportEmergencies().filter((e) => e.status === "resolved");
  }
  return cachedResolvedList;
}

export function getTransportEmergencyById(id: string): TransportEmergency | null {
  return listTransportEmergencies().find((e) => e.id === id) ?? null;
}

export function getActiveTransportEmergencyCount(): number {
  return listActiveTransportEmergencies().length;
}

export function findOpenEmergencyForDriver(driverId: string): TransportEmergency | null {
  if (!driverId) return null;
  return (
    listActiveTransportEmergencies().find(
      (e) => e.driverId === driverId || e.driverId === driverId.replace(/^DRV-/, ""),
    ) ??
    listActiveTransportEmergencies().find((e) => e.driverId === driverId) ??
    null
  );
}

export function findOpenEmergencyForVehicle(vehicleId: string): TransportEmergency | null {
  if (!vehicleId) return null;
  return listActiveTransportEmergencies().find((e) => e.vehicleId === vehicleId) ?? null;
}

function nextEmergencyId(existing: TransportEmergency[]): string {
  const nums = existing
    .map((e) => Number(e.id.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 100) + 1;
  return `SOS-${String(next).padStart(3, "0")}`;
}

export function createTransportEmergency(
  input: CreateTransportEmergencyInput,
): CreateTransportEmergencyResult {
  const snapshot = loadTransportEmergencies();
  const open =
    snapshot.emergencies.find(
      (e) =>
        isEmergencyOpen(e.status) &&
        (e.driverId === input.driverId || e.vehicleId === input.vehicleId),
    ) ?? null;
  if (open) {
    return {
      ok: false,
      created: false,
      emergency: normalizeEmergency(open),
      reason: `SOS ${open.id} is already open. Wait for Admin to resolve it before raising another.`,
    };
  }

  const now = new Date().toISOString();
  const id = nextEmergencyId(snapshot.emergencies);
  const type = input.type ?? "general";
  const emergency: TransportEmergency = {
    id,
    type,
    status: "active",
    createdAt: now,
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    driverId: input.driverId,
    driverName: input.driverName,
    vehicleId: input.vehicleId,
    vehicleNumber: input.vehicleNumber,
    routeCode: input.routeCode,
    routeName: input.routeName,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    note: input.note ?? null,
    timeline: [
      {
        id: `${id}-confirm`,
        at: now,
        label: "SOS confirmed",
        note: "Driver confirmed emergency in Transport app",
      },
      {
        id: `${id}-created`,
        at: now,
        label: "Emergency created",
        note: "Visible on Admin Emergency Desk",
      },
    ],
  };
  snapshot.emergencies = [emergency, ...snapshot.emergencies];
  saveTransportEmergencies(snapshot);
  return { ok: true, created: true, emergency };
}

export function acknowledgeTransportEmergency(input: {
  id: string;
  acknowledgedBy: string;
  note?: string | null;
}): TransportEmergency | null {
  const snapshot = loadTransportEmergencies();
  const idx = snapshot.emergencies.findIndex((e) => e.id === input.id);
  if (idx < 0) return null;
  const prev = normalizeEmergency(snapshot.emergencies[idx]!);
  if (prev.status === "resolved") return prev;
  if (prev.status === "acknowledged") return prev;
  const now = new Date().toISOString();
  const next: TransportEmergency = {
    ...prev,
    status: "acknowledged",
    acknowledgedAt: now,
    acknowledgedBy: input.acknowledgedBy,
    timeline: [
      ...prev.timeline,
      {
        id: `${prev.id}-ack`,
        at: now,
        label: "Acknowledged",
        note: input.note?.trim() || "Admin acknowledged the emergency",
      },
    ],
  };
  snapshot.emergencies[idx] = next;
  saveTransportEmergencies(snapshot);
  return next;
}

export function resolveTransportEmergency(input: {
  id: string;
  resolvedBy: string;
  note?: string | null;
}): TransportEmergency | null {
  const snapshot = loadTransportEmergencies();
  const idx = snapshot.emergencies.findIndex((e) => e.id === input.id);
  if (idx < 0) return null;
  const prev = normalizeEmergency(snapshot.emergencies[idx]!);
  if (prev.status === "resolved") return prev;
  const now = new Date().toISOString();
  const next: TransportEmergency = {
    ...prev,
    status: "resolved",
    resolvedAt: now,
    resolvedBy: input.resolvedBy,
    resolveNote: input.note?.trim() || null,
    // Keep acknowledge fields if already set; otherwise stamp resolve path
    acknowledgedAt: prev.acknowledgedAt ?? now,
    acknowledgedBy: prev.acknowledgedBy ?? input.resolvedBy,
    timeline: [
      ...prev.timeline,
      ...(prev.status === "active"
        ? [
            {
              id: `${prev.id}-ack-auto`,
              at: now,
              label: "Acknowledged",
              note: "Acknowledged on resolve",
            } satisfies TransportEmergencyTimelineEvent,
          ]
        : []),
      {
        id: `${prev.id}-resolved`,
        at: now,
        label: "Resolved",
        note: input.note?.trim() || undefined,
      },
    ],
  };
  snapshot.emergencies[idx] = next;
  saveTransportEmergencies(snapshot);
  return next;
}

export function resetTransportEmergencies(): TransportEmergencySnapshot {
  const seed = seedEmergencies();
  saveTransportEmergencies(seed);
  return seed;
}

export function subscribeTransportEmergencies(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onCustom = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (e.key === TRANSPORT_EMERGENCY_STORAGE_KEY || e.key === null) {
      invalidateEmergencyListCache();
      listener();
    }
  };
  window.addEventListener(TRANSPORT_EMERGENCY_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(TRANSPORT_EMERGENCY_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

export function transportEmergencyTypeLabel(type: TransportEmergencyType): string {
  switch (type) {
    case "breakdown":
      return "Breakdown";
    case "medical":
      return "Medical";
    case "accident":
      return "Accident";
    case "delay":
      return "Major delay";
    case "route_issue":
      return "Route issue";
    case "other":
      return "Other";
    default:
      return "General SOS";
  }
}

export function transportEmergencyStatusLabel(status: TransportEmergencyStatus): string {
  switch (status) {
    case "acknowledged":
      return "Acknowledged";
    case "resolved":
      return "Resolved";
    default:
      return "SOS ACTIVE";
  }
}
