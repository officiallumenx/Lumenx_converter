/**
 * Read-only staging fixture / FCM readiness probe.
 * Never mutates data. Never prints secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

const EXPECTED = "yveadybpntziyryxsrsu";
const INST_CODE = "lx-staging-transport-rt";

const env = loadEnv("backend/.env.staging");
const url = env.SUPABASE_URL || "";
const ref = (url.match(/https?:\/\/([^.]+)/) || [])[1] || "";
if (ref !== EXPECTED) {
  console.error("ABORT: not staging ref");
  process.exit(2);
}

console.log(
  JSON.stringify({
    ref,
    lumenxEnv: env.LUMENX_ENV || null,
    fcmWorker: env.FCM_WORKER_ENABLED || "(unset)",
    fcmAllowProdOutbox: env.FCM_ALLOW_PROD_OUTBOX || "(unset)",
    firebaseProjectId: env.FIREBASE_PROJECT_ID ? "SET" : "EMPTY",
    firebaseClientEmail: env.FIREBASE_CLIENT_EMAIL ? "SET" : "EMPTY",
    firebasePrivateKey: env.FIREBASE_PRIVATE_KEY ? "SET" : "EMPTY",
  }),
);

const sb = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: inst, error: instErr } = await sb
  .from("institute")
  .select("id,code,name,status")
  .eq("code", INST_CODE)
  .is("deleted_at", null)
  .maybeSingle();
if (instErr) {
  console.log("institute_error:", instErr.message);
  process.exit(1);
}
console.log("institute:", inst ?? "MISSING");
if (!inst?.id) process.exit(0);

const { count: students } = await sb
  .from("student")
  .select("id", { count: "exact", head: true })
  .eq("institute_id", inst.id)
  .is("deleted_at", null);

const { data: routes } = await sb
  .from("route")
  .select("id,name,status,approval_status,driver_id,vehicle_id")
  .eq("institute_id", inst.id)
  .is("deleted_at", null);

const routeIds = (routes || []).map((r) => r.id);
let stops = [];
if (routeIds.length) {
  const { data, error } = await sb
    .from("stop")
    .select("id,name,route_order,route_id,kind,approval_status")
    .in("route_id", routeIds)
    .is("deleted_at", null)
    .order("route_order");
  if (error) console.log("stops_error:", error.message);
  stops = data || [];
}

const { data: drivers, error: drvErr } = await sb
  .from("driver")
  .select("id,user_profile_id,status,vehicle_id,deleted_at")
  .eq("institute_id", inst.id);
if (drvErr) console.log("drivers_error:", drvErr.message);

const { data: parents, error: parErr } = await sb
  .from("parent")
  .select("id,user_profile_id,email,phone,deleted_at")
  .eq("institute_id", inst.id);
if (parErr) console.log("parents_error:", parErr.message);

const { count: enrollments } = await sb
  .from("transport_enrollment")
  .select("id", { count: "exact", head: true })
  .eq("institute_id", inst.id)
  .is("deleted_at", null);

const { count: links } = await sb
  .from("guardian_link")
  .select("id", { count: "exact", head: true })
  .eq("institute_id", inst.id)
  .is("deleted_at", null);

const liveDrivers = (drivers || []).filter((d) => !d.deleted_at);
const liveParents = (parents || []).filter((p) => !p.deleted_at);

const threeSiblingReady =
  (students || 0) >= 3 &&
  (routes || []).length >= 1 &&
  (stops || []).length >= 2 &&
  liveDrivers.length >= 1 &&
  liveParents.length >= 1 &&
  (enrollments || 0) >= 3 &&
  (links || 0) >= 3;

const sequentialStopsReady = (stops || []).length >= 3;

console.log(
  JSON.stringify(
    {
      students_count: students,
      routes: routes || [],
      stops,
      drivers_live: liveDrivers.length,
      parents_live: liveParents.length,
      enrollments_count: enrollments,
      guardian_links_count: links,
      three_sibling_core_ready: threeSiblingReady,
      sequential_three_stops_ready: sequentialStopsReady,
    },
    null,
    2,
  ),
);
