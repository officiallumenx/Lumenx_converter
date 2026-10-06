#!/usr/bin/env node
/**
 * Phase 10 — Transport GPS / fanout load simulation (CPU-bound, no network).
 *
 * Models:
 *   - N buses pinging every 15s
 *   - route-scoped participants with spatial prefilter
 *   - GPS write thinning
 *   - async notification fanout cost (enqueue only)
 *
 * Usage:
 *   node backend/scripts/transport-phase10-load.mjs
 *   BUSES=40 STUDENTS_PER_BUS=120 SECONDS=120 node backend/scripts/transport-phase10-load.mjs
 */

function haversineMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const GPS_PERSIST_MIN_MOVE_M = 25;
const GPS_PERSIST_MAX_INTERVAL_MS = 60_000;
const APPROACH_EVAL_RADIUS_M = 30 * 500 + 2_000;
const PING_MS = 15_000;

function shouldPersist(previous, next) {
  if (!previous) return { persist: true, reason: "first" };
  const distanceM = haversineMeters(previous, next);
  const ageMs = next.t - previous.t;
  if (distanceM >= GPS_PERSIST_MIN_MOVE_M) return { persist: true, reason: "moved", distanceM };
  if (ageMs >= GPS_PERSIST_MAX_INTERVAL_MS) return { persist: true, reason: "heartbeat", distanceM };
  return { persist: false, reason: "thinned", distanceM };
}

function buildInstitute({ buses, studentsPerBus, stopsPerBus }) {
  const fleet = [];
  for (let b = 0; b < buses; b++) {
    const baseLat = 12.9 + b * 0.01;
    const baseLng = 77.5 + b * 0.01;
    const stops = [];
    for (let s = 0; s < stopsPerBus; s++) {
      stops.push({
        id: `stop-${b}-${s}`,
        latitude: baseLat + s * 0.002,
        longitude: baseLng,
        radiusM: 150,
      });
    }
    const students = [];
    for (let i = 0; i < studentsPerBus; i++) {
      students.push({
        id: `stu-${b}-${i}`,
        stopId: stops[i % stops.length].id,
      });
    }
    fleet.push({
      busId: `bus-${b}`,
      lat: baseLat,
      lng: baseLng,
      stops,
      students,
      lastPersisted: null,
      writes: 0,
      thinned: 0,
      approachEvals: 0,
      notifyEnqueues: 0,
    });
  }
  return fleet;
}

function pingBus(bus, t, moving) {
  if (moving) {
    bus.lat += 0.0003; // ~33m
  } else {
    bus.lat += 0.00001; // ~1m
  }
  const next = { latitude: bus.lat, longitude: bus.lng, t };
  const decision = shouldPersist(bus.lastPersisted, next);
  if (decision.persist) {
    bus.writes += 1;
    bus.lastPersisted = next;
  } else {
    bus.thinned += 1;
  }

  // Route-scoped + spatial filter (Phase 10 approach path)
  const stopById = new Map(bus.stops.map((s) => [s.id, s]));
  const nearbyStudents = [];
  for (const student of bus.students) {
    const stop = stopById.get(student.stopId);
    const distanceM = haversineMeters(next, stop);
    bus.approachEvals += 1; // counted as candidate checks after route scope
    if (distanceM <= APPROACH_EVAL_RADIUS_M) {
      nearbyStudents.push(student);
      if (distanceM <= stop.radiusM) {
        bus.notifyEnqueues += 1; // arrival enqueue (async)
      } else if (distanceM <= 15_000) {
        bus.notifyEnqueues += 0.05; // rare approach band hit (amortized)
      }
    }
  }
  return nearbyStudents.length;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function main() {
  const buses = Number(process.env.BUSES ?? 20);
  const studentsPerBus = Number(process.env.STUDENTS_PER_BUS ?? 80);
  const stopsPerBus = Number(process.env.STOPS_PER_BUS ?? 12);
  const seconds = Number(process.env.SECONDS ?? 120);
  const ticks = Math.floor(seconds / (PING_MS / 1000));

  const fleet = buildInstitute({ buses, studentsPerBus, stopsPerBus });
  const pingDurations = [];

  const t0 = performance.now();
  for (let tick = 0; tick < ticks; tick++) {
    const t = tick * PING_MS;
    const moving = tick % 4 !== 0; // mostly moving, occasional idle
    const tickStart = performance.now();
    for (const bus of fleet) {
      pingBus(bus, t, moving);
    }
    pingDurations.push(performance.now() - tickStart);
  }
  const wallMs = performance.now() - t0;
  pingDurations.sort((a, b) => a - b);

  const totalStudents = buses * studentsPerBus;
  const writes = fleet.reduce((s, b) => s + b.writes, 0);
  const thinned = fleet.reduce((s, b) => s + b.thinned, 0);
  const naiveWrites = buses * ticks;
  const notify = fleet.reduce((s, b) => s + b.notifyEnqueues, 0);

  const report = {
    scenario: {
      buses,
      studentsPerBus,
      stopsPerBus,
      totalStudents,
      durationSec: seconds,
      pingIntervalSec: PING_MS / 1000,
      ticks,
    },
    results: {
      wallMs: Math.round(wallMs),
      tickP50Ms: Number(percentile(pingDurations, 50).toFixed(3)),
      tickP95Ms: Number(percentile(pingDurations, 95).toFixed(3)),
      tickP99Ms: Number(percentile(pingDurations, 99).toFixed(3)),
      gpsWrites: writes,
      gpsThinned: thinned,
      naiveWritesIfEveryPingStored: naiveWrites,
      writeReductionPct: Number(
        (((naiveWrites - writes) / Math.max(1, naiveWrites)) * 100).toFixed(1),
      ),
      notifyEnqueuesApprox: Math.round(notify),
    },
    bottlenecksAddressed: [
      "Route-scoped enrollment + stop geometry cache (no institute-wide scan per ping)",
      "Spatial prefilter APPROACH_EVAL_RADIUS_M skips far stops",
      "GPS write thinning (~25m / 60s heartbeat) preserves live tracking",
      "Approach/push fanout is async (outbox) — not on GPS request critical path",
      "Admin realtime: GPS invalidates trips only (debounced), not analytics dump",
      "Connect: 120s safety poll when realtime connected",
      "Indexes: enrollment(route), trip(route), vehicle_location(institute,captured_at)",
    ],
    remainingRisks: [
      "Analytics still loads fleet lists for the day — keep elevated-staff only",
      "Supabase Realtime filter requires publication + replica identity for institute_id",
      "Very dense urban stops may still enqueue many approach bands — dedupe keys bound this",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
