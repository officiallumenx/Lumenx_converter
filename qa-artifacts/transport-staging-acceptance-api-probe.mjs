/**
 * Staging-only Transport acceptance API probe (no production).
 * Uses smoke users from .env.staging. Prints counts/booleans only — no tokens/secrets.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/transport-staging-acceptance-api-probe.mjs
 *
 * Requires local staging API at SMOKE_API_BASE_URL / E2E_API_BASE_URL (default 127.0.0.1:8787).
 * Does NOT start trips or send FCM (FCM may be disabled on staging).
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { assertStagingEnv, extractSupabaseProjectRef } = require(
  resolve(root, "backend/scripts/assert-staging-env.mjs"),
);

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (ref !== "yveadybpntziyryxsrsu") {
  throw new Error(`Refuse: unexpected ref ${ref}`);
}
if (ref === "kmpzflsurepjwqnfqyld") {
  throw new Error("Refuse: denylisted project");
}

const base = (
  process.env.SMOKE_API_BASE_URL ||
  process.env.E2E_API_BASE_URL ||
  "http://127.0.0.1:8787"
).replace(/\/$/, "");

const password =
  process.env.E2E_SMOKE_PASSWORD?.trim() ||
  process.env.NEXUS_BOOTSTRAP_PASSWORD?.trim();
if (!password) throw new Error("Missing E2E_SMOKE_PASSWORD");

async function passwordLogin(email) {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`login failed for ${email.split("@")[0]}@… (${res.status})`);
  }
  return json.access_token;
}

async function api(token, path) {
  const res = await fetch(`${base}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const out = {
  staging_ref: ref,
  api_base: base.replace(/\/\/.*@/, "//"),
  health: null,
  ready: null,
  driver: null,
  roster: null,
  parent_inbox: null,
  three_sibling_ready: false,
  fcm_note: "Staging API started with FCM disabled — push delivery NOT verifiable here",
  trip_mutations: "NOT RUN (probe is read-only)",
};

const health = await fetch(`${base}/api/v1/health`);
out.health = { status: health.status, body: await health.json() };
const ready = await fetch(`${base}/api/v1/health/ready`);
out.ready = { status: ready.status, body: await ready.json() };

const driverToken = await passwordLogin("smoke.transport.driver@lumenx.test");
const me = await api(driverToken, "/api/v1/me");
const instituteId =
  me.json?.data?.institutes?.find((i) => i.status === "active")?.instituteId ??
  me.json?.data?.institutes?.[0]?.instituteId ??
  null;

const driverMe = instituteId
  ? await api(
      driverToken,
      `/api/v1/transport/drivers/me?institute_id=${instituteId}`,
    )
  : { status: 0, json: {} };

const roster = instituteId
  ? await api(
      driverToken,
      `/api/v1/transport/portal/driver-route-roster?institute_id=${instituteId}`,
    )
  : { status: 0, json: {} };

const students = roster.json?.data?.students ?? [];
const uniqueStudents = new Set(students.map((s) => s.studentId)).size;
const uniquePickupStops = new Set(
  students.map((s) => s.pickupStopId).filter(Boolean),
).size;

out.driver = {
  me_status: me.status,
  institute_present: Boolean(instituteId),
  drivers_me_status: driverMe.status,
  driver_id_present: Boolean(driverMe.json?.data?.driverId),
};
out.roster = {
  status: roster.status,
  route_id_present: Boolean(roster.json?.data?.routeId),
  student_count: uniqueStudents,
  distinct_pickup_stops: uniquePickupStops,
  locked: Boolean(roster.json?.data?.locked),
};

const parentToken = await passwordLogin("smoke.connect.parent@lumenx.test");
const inbox = await api(
  parentToken,
  `/api/v1/notifications/inbox?limit=20`,
);
const items = inbox.json?.data ?? inbox.json?.items ?? [];
const transportItems = (Array.isArray(items) ? items : []).filter((row) => {
  const cat = row.category ?? row.notification?.category;
  const kind = row.payload?.kind ?? row.notification?.payload?.kind;
  return cat === "transport" || String(kind || "").startsWith("TRIP_") || String(kind || "").startsWith("STOP_");
});
out.parent_inbox = {
  status: inbox.status,
  recent_transport_rows: transportItems.length,
  recent_kinds: [
    ...new Set(
      transportItems
        .map((r) => r.payload?.kind ?? r.notification?.payload?.kind ?? r.title)
        .filter(Boolean)
        .slice(0, 10),
    ),
  ],
};

out.three_sibling_ready =
  uniqueStudents >= 3 && uniquePickupStops >= 3;

console.log(JSON.stringify(out, null, 2));
process.exit(out.health?.body?.status === "ok" && out.driver?.drivers_me_status === 200 ? 0 : 1);
