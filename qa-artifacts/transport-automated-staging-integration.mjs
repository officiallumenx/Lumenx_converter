/**
 * Staging-only automated three-sibling integration (synthetic fixture).
 * Verifies roster S1→S2→S3, optionally runs a soft trip start → school GPS
 * (no school-arrived expected during start grace) → S1 arrival → STOP_NEXT for S2,
 * then soft-deletes the trip. Never prints secrets. FCM delivery is NOT claimed.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/transport-automated-staging-integration.mjs
 *
 * Set TRANSPORT_LIVE_MUTATIONS=0 to force read-only.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

const EXPECTED = "yveadybpntziyryxsrsu";
const DENIED = "kmpzflsurepjwqnfqyld";
const DRIVER_EMAIL = "smoke.staging.transport.rt.driver@lumenx.test";
const PARENT_EMAIL = "smoke.staging.transport.rt.parent@lumenx.test";
const LIVE = (process.env.TRANSPORT_LIVE_MUTATIONS ?? "1").trim() !== "0";

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (ref !== EXPECTED) {
  console.error(`BLOCKED: ref ${ref}`);
  process.exit(2);
}
if (ref === DENIED) {
  console.error("BLOCKED: denylist");
  process.exit(2);
}

const API = (
  process.env.E2E_API_BASE_URL ||
  process.env.SMOKE_API_BASE_URL ||
  "http://127.0.0.1:8787"
).replace(/\/$/, "");
const PASSWORD =
  process.env.E2E_SMOKE_PASSWORD?.trim() ||
  process.env.NEXUS_BOOTSTRAP_PASSWORD?.trim() ||
  "";
if (!PASSWORD) {
  console.error("BLOCKED: E2E_SMOKE_PASSWORD required");
  process.exit(2);
}

const report = {
  staging_ref: ref,
  api: API,
  live_mutations: LIVE,
  fcm_push: "NOT RUN",
  steps: {},
};

async function apiJson(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data };
}

async function passwordLogin(email) {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`login failed ${email.split("@")[0]} (${res.status})`);
  }
  return json.access_token;
}

function inboxItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function notifKind(item) {
  const n = item?.notification ?? item;
  return String(
    n?.payload?.kind ?? n?.kind ?? item?.kind ?? item?.eventKind ?? "",
  );
}

function notifDedupe(item) {
  const n = item?.notification ?? item;
  return String(n?.dedupe_key ?? n?.dedupeKey ?? item?.dedupe_key ?? "");
}

// ── Health ──────────────────────────────────────────────────────────
{
  const health = await fetch(`${API}/api/v1/health`);
  const ready = await fetch(`${API}/api/v1/health/ready`);
  const healthJson = await health.json().catch(() => ({}));
  const readyJson = await ready.json().catch(() => ({}));
  report.steps.health = {
    status: health.status,
    ok: healthJson?.status === "ok",
  };
  report.steps.ready = {
    status: ready.status,
    supabase: readyJson?.checks?.supabase,
    fcmConfigured: Boolean(readyJson?.checks?.fcm?.firebaseConfigured),
    fcmMessagingReady: Boolean(readyJson?.checks?.fcm?.messagingReady),
  };
  if (!report.steps.health.ok || readyJson?.checks?.supabase !== "ok") {
    console.log(JSON.stringify(report, null, 2));
    console.error("BLOCKED: staging API not healthy/ready");
    process.exit(2);
  }
  if (report.steps.ready.fcmMessagingReady) {
    // Prefer not to blast push during automated acceptance; still continue with DB checks.
    report.fcm_push = "CONFIGURED_BUT_NOT_CLAIMED";
  }
}

const driverToken = await passwordLogin(DRIVER_EMAIL);
const parentToken = await passwordLogin(PARENT_EMAIL);
report.steps.auth = { driver: "PASS", parent: "PASS" };

const me = await apiJson("/api/v1/me", { token: driverToken });
const instituteId =
  me.data?.institutes?.find((i) => i.status === "active")?.instituteId ??
  me.data?.institutes?.[0]?.instituteId ??
  null;
if (!instituteId) {
  console.log(JSON.stringify(report, null, 2));
  console.error("BLOCKED: no institute for RT driver");
  process.exit(2);
}

const roster = await apiJson(
  `/api/v1/transport/portal/driver-route-roster?institute_id=${instituteId}`,
  { token: driverToken },
);
const students = roster.data?.students ?? [];
const pickupStops = [
  ...new Set(students.map((s) => s.pickupStopId).filter(Boolean)),
];
report.steps.roster = {
  status: roster.res.status,
  route_id: Boolean(roster.data?.routeId),
  student_count: new Set(students.map((s) => s.studentId)).size,
  distinct_pickup_stops: pickupStops.length,
  vehicle_id: Boolean(roster.data?.vehicleId),
};
report.steps.three_sibling_ready =
  report.steps.roster.student_count >= 3 &&
  report.steps.roster.distinct_pickup_stops >= 3 &&
  report.steps.roster.route_id;

if (!report.steps.three_sibling_ready) {
  console.log(JSON.stringify(report, null, 2));
  console.error("BLOCKED: RT fixture roster not three-sibling ready");
  process.exit(2);
}

// Soft RO verify stop order via service role (synthetic institute only)
{
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data: route } = await admin
    .from("route")
    .select("id")
    .eq("id", roster.data.routeId)
    .maybeSingle();
  const { data: stops } = await admin
    .from("stop")
    .select("name,route_order,kind")
    .eq("route_id", route.id)
    .is("deleted_at", null)
    .order("route_order");
  report.steps.stop_order = (stops || []).map((s) => ({
    name: s.name,
    order: s.route_order,
    kind: s.kind,
  }));
  const names = (stops || []).map((s) => s.name);
  report.steps.stop_order_ok =
    names[0] === "STG RT S1" &&
    names[1] === "STG RT S2" &&
    names[2] === "STG RT S3";
}

if (!LIVE) {
  report.steps.live = "SKIPPED (TRANSPORT_LIVE_MUTATIONS=0)";
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.steps.stop_order_ok ? 0 : 1);
}

const driverMe = await apiJson(
  `/api/v1/transport/drivers/me?institute_id=${instituteId}`,
  { token: driverToken },
);
const vehicleId = roster.data?.vehicleId || driverMe.data?.vehicleId;
const routeId = roster.data?.routeId;
const driverId = driverMe.data?.driverId || roster.data?.driverId;
if (!vehicleId || !routeId || !driverId) {
  console.log(JSON.stringify(report, null, 2));
  console.error("BLOCKED: missing vehicle/route/driver");
  process.exit(2);
}

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
}).format(new Date());

// Soft-delete prior live trips for this vehicle today (staging fixture only)
{
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  await admin
    .from("transport_trip")
    .update({ deleted_at: new Date().toISOString() })
    .eq("vehicle_id", vehicleId)
    .eq("trip_date", today)
    .is("deleted_at", null);
}

const school = { lat: 17.39, lng: 78.49 };
const s1 = { lat: 17.385, lng: 78.4867 };
const latency = { start_ms: [], end_ms: [] };

async function timed(label, fn) {
  const t0 = Date.now();
  const result = await fn();
  const ms = Date.now() - t0;
  return { result, ms, label };
}

const startTimed = await timed("start", async () => {
  const clientEventId = randomUUID();
  return apiJson("/api/v1/transport/trips", {
    method: "POST",
    token: driverToken,
    body: {
      institute_id: instituteId,
      vehicle_id: vehicleId,
      route_id: routeId,
      driver_id: driverId,
      slot: "morning",
      trip_date: today,
      client_event_id: clientEventId,
    },
  });
});
latency.start_ms.push(startTimed.ms);
const trip = startTimed.result.data;
report.steps.trip_start = {
  status: startTimed.result.res.status,
  trip_id: Boolean(trip?.id),
  phase: trip?.phase ?? null,
  api_ms: startTimed.ms,
  error: startTimed.result.res.ok
    ? null
    : startTimed.result.json?.error?.message ?? "start_failed",
};

if (!trip?.id) {
  console.log(JSON.stringify({ ...report, latency }, null, 2));
  console.error("BLOCKED: trip start failed");
  process.exit(1);
}

// Move to running if still starting
if (trip.phase === "starting" || trip.phase === "ready") {
  const patch = await apiJson(`/api/v1/transport/trips/${trip.id}/phase`, {
    method: "PATCH",
    token: driverToken,
    body: { phase: "running", client_event_id: randomUUID() },
  });
  report.steps.phase_running = { status: patch.res.status };
}

// GPS at school immediately (still within grace / early running) — should NOT school-arrive
{
  const ping = await apiJson(
    `/api/v1/transport/trips/${trip.id}/location`,
    {
      method: "POST",
      token: driverToken,
      body: {
        latitude: school.lat,
        longitude: school.lng,
        accuracy_m: 8,
        captured_at: new Date().toISOString(),
        client_event_id: randomUUID(),
      },
    },
  );
  report.steps.school_gps_early = { status: ping.res.status };

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data: tripRow } = await admin
    .from("transport_trip")
    .select("school_arrived_at,phase,started_at")
    .eq("id", trip.id)
    .maybeSingle();
  report.steps.false_school_arrival = {
    school_arrived_at: tripRow?.school_arrived_at ?? null,
    pass: tripRow?.school_arrived_at == null,
  };
}

// Arrive S1 — expect STOP_ARRIVED and STOP_NEXT for S2 in parent inbox (DB)
{
  const ping = await apiJson(
    `/api/v1/transport/trips/${trip.id}/location`,
    {
      method: "POST",
      token: driverToken,
      body: {
        latitude: s1.lat,
        longitude: s1.lng,
        accuracy_m: 8,
        captured_at: new Date().toISOString(),
        client_event_id: randomUUID(),
      },
    },
  );
  report.steps.s1_gps = { status: ping.res.status };

  // Brief settle for notification emit
  await new Promise((r) => setTimeout(r, 1500));

  const inbox = await apiJson(
    `/api/v1/notifications?institute_id=${instituteId}`,
    { token: parentToken },
  );
  const items = inboxItems(inbox.data ?? inbox.json);
  const kinds = items.map(notifKind);
  const started = items.filter(
    (i) =>
      notifKind(i) === "TRIP_STARTED" ||
      /:started:parent$/.test(notifDedupe(i)),
  );
  const arrived = items.filter(
    (i) =>
      notifKind(i) === "STOP_ARRIVED" || /:arrived$/.test(notifDedupe(i)),
  );
  const next = items.filter(
    (i) =>
      notifKind(i) === "STOP_NEXT" || /:next$/.test(notifDedupe(i)),
  );
  const schoolArrivedNotifs = items.filter(
    (i) =>
      notifKind(i) === "SCHOOL_ARRIVED" ||
      /school_arrived/.test(notifDedupe(i)),
  );

  // DB SoT for this trip's notification rows (no FCM claim)
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data: notifRows } = await admin
    .from("notification")
    .select("dedupe_key,payload")
    .eq("institute_id", instituteId)
    .like("dedupe_key", `transport:${trip.id}:%`);
  const dbKeys = (notifRows || []).map((r) => r.dedupe_key);
  report.steps.parent_notifications = {
    inbox_status: inbox.res.status,
    trip_started_rows: started.length,
    stop_arrived_rows: arrived.length,
    stop_next_rows: next.length,
    school_arrived_rows: schoolArrivedNotifs.length,
    sample_kinds: [...new Set(kinds.filter(Boolean))].slice(0, 12),
    db_dedupe_keys: dbKeys.slice(0, 20),
    db_trip_started: dbKeys.some((k) => String(k).endsWith(":started:parent")),
    db_stop_next: dbKeys.some((k) => String(k).includes(":next")),
    db_school_arrived: dbKeys.some((k) =>
      String(k).includes("school_arrived"),
    ),
  };
}

// Board child 1 (optional attendance)
{
  const child1 = students[0];
  if (child1?.studentId && child1?.pickupStopId) {
    const clientEventId = randomUUID();
    const body = {
      student_id: child1.studentId,
      stop_id: child1.pickupStopId,
      boarding_status: "boarded",
      client_event_id: clientEventId,
    };
    const mark = await apiJson(
      `/api/v1/transport/trips/${trip.id}/boarding`,
      { method: "POST", token: driverToken, body },
    );
    const retry = await apiJson(
      `/api/v1/transport/trips/${trip.id}/boarding`,
      { method: "POST", token: driverToken, body },
    );
    report.steps.board_child1 = {
      status: mark.res.status,
      retry_status: retry.res.status,
      idempotent_ok: mark.res.ok && retry.res.ok,
    };
  }
}

const endTimed = await timed("end", async () =>
  apiJson(`/api/v1/transport/trips/${trip.id}/end`, {
    method: "POST",
    token: driverToken,
    body: { client_event_id: randomUUID() },
  }),
);
latency.end_ms.push(endTimed.ms);
report.steps.trip_end = {
  status: endTimed.result.res.status,
  api_ms: endTimed.ms,
};

// Soft-delete this run's trip
{
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  await admin
    .from("transport_trip")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", trip.id);
  report.steps.soft_cleanup = "PASS";
}

function stats(samples) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    n: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median:
      sorted.length % 2
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
  };
}

report.latency = {
  start: stats(latency.start_ms),
  end: stats(latency.end_ms),
  note: "Wall-clock API round-trips from this harness (not device UI).",
};

report.verdict = {
  fixture: report.steps.three_sibling_ready ? "PASS" : "FAIL",
  false_school_arrival: report.steps.false_school_arrival?.pass
    ? "PASS"
    : "FAIL",
  trip_start: report.steps.trip_start?.trip_id ? "PASS" : "FAIL",
  notifications_observed: report.steps.parent_notifications
    ? "PARTIAL"
    : "NOT RUN",
  fcm_push: "NOT RUN",
};

console.log(JSON.stringify(report, null, 2));
const ok =
  report.steps.three_sibling_ready &&
  report.steps.false_school_arrival?.pass &&
  report.steps.trip_start?.trip_id;
process.exit(ok ? 0 : 1);
