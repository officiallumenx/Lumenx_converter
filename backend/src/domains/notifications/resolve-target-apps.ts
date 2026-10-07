import type { DeviceApp, NotificationCategory } from "./types.js";

const ALL_DEVICE_APPS: readonly DeviceApp[] = [
  "connect",
  "admin",
  "transport",
  "nexus",
  "careers",
  "admissions",
] as const;

export function isDeviceApp(value: string): value is DeviceApp {
  return (ALL_DEVICE_APPS as readonly string[]).includes(value);
}

/** Normalize and dedupe target apps; drop unknowns. */
export function normalizeTargetApps(apps: readonly string[] | null | undefined): DeviceApp[] {
  if (!apps?.length) return [];
  const out: DeviceApp[] = [];
  for (const raw of apps) {
    const v = String(raw).trim().toLowerCase();
    if (!isDeviceApp(v)) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Resolve FCM target apps for a notification.
 * Explicit list wins; otherwise category defaults (transport must be explicit).
 */
export function resolveTargetApps(
  category: NotificationCategory,
  explicit?: readonly DeviceApp[] | null,
): DeviceApp[] {
  const fromExplicit = normalizeTargetApps(explicit ?? undefined);
  if (fromExplicit.length > 0) return fromExplicit;

  switch (category) {
    case "admissions":
      return ["admissions"];
    case "careers":
      return ["careers"];
    case "nexus":
      return ["nexus"];
    case "transport":
      // Transport emitters must pass targetApps (parent→connect, driver→transport, staff→admin).
      // Fallback avoids silent cross-app fanout if a caller forgets.
      return ["connect"];
    case "system":
      // System may fan out to parents (Connect) or staff (Admin); callers should
      // pass explicit targetApps. Safe default covers both until callers specify.
      return ["connect", "admin"];
    default:
      return ["connect"];
  }
}

export function targetAppsForTransportAudience(
  audience: "parent" | "driver" | "admin",
): DeviceApp[] {
  switch (audience) {
    case "parent":
      return ["connect"];
    case "driver":
      return ["transport"];
    case "admin":
      return ["admin"];
  }
}
