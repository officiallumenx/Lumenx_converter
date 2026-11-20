/**
 * Repeat start/end API latency against staging RT fixture (synthetic only).
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/transport-start-end-latency-harness.mjs
 *
 * Env:
 *   TRANSPORT_LATENCY_SAMPLES=5 (default 5, max 10)
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

const EXPECTED = "yveadybpntziyryxsrsu";
const DRIVER_EMAIL = "smoke.staging.transport.rt.driver@lumenx.test";
const SAMPLES = Math.min(
  10,
  Math.max(1, Number(process.env.TRANSPORT_LATENCY_SAMPLES || 5)),
);

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (ref !== EXPECTED) {
  console.error("BLOCKED: not staging");
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
  console.error("BLOCKED: password");
  process.exit(2);
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
  if (!res.ok || !json.access_token) throw new Error(`login ${res.status}`);
  return json.access_token;
}

async function apiJson(path, { method = "GET", token, body } = {}) {
  const t0 = Date.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data, ms: Date.now() - t0 };
}

function stats(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return {
    n: s.length,
    min: s[0],
    max: s[s.length - 1],
    median:
      s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2),
    mean: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
  };
}

const health = await fetch(`${API}/api/v1/health/ready`);
const ready = await health.json().catch(() => ({}));
if (ready?.checks?.supabase !== "ok") {
  console.error("BLOCKED: API not ready");
  process.exit(2);
}

const token = await passwordLogin(DRIVER_EMAIL);
const me = await apiJson("/api/v1/me", { token });
const instituteId =
  me.data?.institutes?.find((i) => i.status === "active")?.instituteId ??
  me.data?.institutes?.[0]?.instituteId;
const roster = await apiJson(
  `/api/v1/transport/portal/driver-route-roster?institute_id=${instituteId}`,
  { token },
);
const driverMe = await apiJson(
  `/api/v1/transport/drivers/me?institute_id=${instituteId}`,
  { token },
);
const vehicleId = roster.data?.vehicleId || driverMe.data?.vehicleId;
const routeId = roster.data?.routeId;
const driverId = driverMe.data?.driverId || roster.data?.driverId;
if (!vehicleId || !routeId || !driverId) {
  console.error("BLOCKED: roster incomplete");
  process.exit(2);
}

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
}).format(new Date());
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const startSamples = [];
const endSamples = [];
const phaseSamples = [];

for (let i = 0; i < SAMPLES; i++) {
  await admin
    .from("transport_trip")
    .update({ deleted_at: new Date().toISOString() })
    .eq("vehicle_id", vehicleId)
    .eq("trip_date", today)
    .is("deleted_at", null);

  const start = await apiJson("/api/v1/transport/trips", {
    method: "POST",
    token,
    body: {
      institute_id: instituteId,
      vehicle_id: vehicleId,
      route_id: routeId,
      driver_id: driverId,
      slot: "morning",
      trip_date: today,
      client_event_id: randomUUID(),
    },
  });
  if (!start.data?.id) {
    console.error(
      "start failed",
      start.res.status,
      start.json?.error?.message || "",
    );
    process.exit(1);
  }
  startSamples.push(start.ms);

  if (start.data.phase === "starting" || start.data.phase === "ready") {
    const phase = await apiJson(
      `/api/v1/transport/trips/${start.data.id}/phase`,
      {
        method: "PATCH",
        token,
        body: { phase: "running", client_event_id: randomUUID() },
      },
    );
    if (phase.res.ok) phaseSamples.push(phase.ms);
  }

  const end = await apiJson(`/api/v1/transport/trips/${start.data.id}/end`, {
    method: "POST",
    token,
    body: { client_event_id: randomUUID() },
  });
  endSamples.push(end.ms);

  await admin
    .from("transport_trip")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", start.data.id);
}

console.log(
  JSON.stringify(
    {
      staging_ref: ref,
      api: API,
      samples: SAMPLES,
      start_trip_api_ms: stats(startSamples),
      phase_running_api_ms: phaseSamples.length
        ? stats(phaseSamples)
        : null,
      end_trip_api_ms: stats(endSamples),
      client_ui_ms: "NOT RUN (no device)",
      note: "API wall-clock only; excludes GPS ladder and UI hydrate.",
    },
    null,
    2,
  ),
);
