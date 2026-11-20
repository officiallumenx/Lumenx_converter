/**
 * Start/end API waterfall probe — counts sequential client round-trips.
 * Optional live timing against staging when LUMENX_ENV=staging and
 * TRANSPORT_LATENCY_PROBE=1 (synthetic fixture auth only).
 *
 * Default: static analysis print (safe, no network).
 * Never prints secrets. Never targets production denylist ref.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const START_WATERFALL = [
  {
    step: 1,
    name: "runTripReadinessChecks",
    kind: "client",
    notes: "Sequential internet → notifications → GPS (up to 4 fix attempts)",
  },
  {
    step: 2,
    name: "POST /api/v1/transport/trips (startTransportTrip)",
    kind: "api",
    notes: "Creates trip phase=starting; notifies TRIP_STARTED",
  },
  {
    step: 3,
    name: "PATCH trip phase → running",
    kind: "api",
    notes: "Second round-trip; confirmStartTripViaApi awaits this before return",
  },
  {
    step: 4,
    name: "hydrateAttendanceFromApi / list boarding",
    kind: "api",
    notes: "After start confirmation on client",
  },
  {
    step: 5,
    name: "captureCurrentGps first ping",
    kind: "client+api",
    notes: "May re-run full GPS ladder then POST vehicle location",
  },
];

const END_WATERFALL = [
  {
    step: 1,
    name: "GET active-trip for vehicle",
    kind: "api",
    notes: "endTripViaApi resolves active id",
  },
  {
    step: 2,
    name: "POST/PATCH trip end",
    kind: "api",
    notes: "endTransportTrip",
  },
  {
    step: 3,
    name: "hydrateActiveTripFromApi",
    kind: "api",
    notes: "getActiveTrip + listTransportTrips(today) in parallel-ish then apply flags",
  },
  {
    step: 4,
    name: "flushOpsOutbox",
    kind: "client+api",
    notes: "May drain queued GPS before UI settles",
  },
];

function printStatic() {
  console.log(
    JSON.stringify(
      {
        mode: "static",
        start_sequential_api_calls: START_WATERFALL.filter((s) =>
          s.kind.includes("api"),
        ).length,
        end_sequential_api_calls: END_WATERFALL.filter((s) =>
          s.kind.includes("api"),
        ).length,
        start_waterfall: START_WATERFALL,
        end_waterfall: END_WATERFALL,
        optimization_candidates: [
          "Combine create+running into one server op",
          "Reuse readiness GPS fix for first ping if age < 30–60s",
          "Return day flags from endTransportTrip to skip list-trips",
          "Background flushOpsOutbox after UI transition on end",
        ],
        measured_ms: null,
        note: "Set TRANSPORT_LATENCY_PROBE=1 with staging auth to measure live RTT (not run by default).",
      },
      null,
      2,
    ),
  );
}

async function maybeLive() {
  if (process.env.TRANSPORT_LATENCY_PROBE !== "1") {
    printStatic();
    return;
  }
  const { assertStagingEnv, extractSupabaseProjectRef } = require(
    resolve(root, "backend/scripts/assert-staging-env.mjs"),
  );
  assertStagingEnv(process.env);
  const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
  if (ref !== "yveadybpntziyryxsrsu") {
    throw new Error(`Refusing live probe: unexpected ref ${ref}`);
  }
  if (ref === "kmpzflsurepjwqnfqyld") {
    throw new Error("Refusing live probe against denylisted project");
  }
  // Live RTT measurement requires a driver token + vehicle — leave as explicit
  // manual step rather than inventing credentials here.
  console.log(
    JSON.stringify(
      {
        mode: "live_gated",
        staging_ref: ref,
        measured_ms: null,
        blocker:
          "Provide TRANSPORT_PROBE_ACCESS_TOKEN + institute/vehicle ids via env to time real start/end; not auto-run to avoid mutating trips.",
        static_waterfall: { start: START_WATERFALL, end: END_WATERFALL },
      },
      null,
      2,
    ),
  );
}

await maybeLive();
