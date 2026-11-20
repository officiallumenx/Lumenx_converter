import type { DriverRouteRosterStop } from "@/lib/transport-api";

/** Stops that cannot participate in arrival geofence (missing/invalid GPS). */
export function listStopsMissingCoords(
  stops: Array<
    Pick<DriverRouteRosterStop, "id" | "name" | "latitude" | "longitude" | "kind">
  >,
): Array<{ id: string; name: string }> {
  const missing: Array<{ id: string; name: string }> = [];
  for (const stop of stops) {
    if (stop.kind === "school" || stop.kind === "parking") continue;
    const lat = Number(stop.latitude);
    const lng = Number(stop.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      missing.push({
        id: stop.id,
        name: String(stop.name ?? "").trim() || "Unnamed stop",
      });
    }
  }
  return missing;
}
