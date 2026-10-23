/**
 * Continue matrix against seeded trip id (argv[2] or env MATRIX_TRIP_ID).
 */
import { createClient } from "@supabase/supabase-js";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

assertStagingEnv(process.env);
if (extractSupabaseProjectRef(process.env.SUPABASE_URL) !== "yveadybpntziyryxsrsu") {
  throw new Error("Wrong project ref");
}

const tripId =
  process.argv[2]?.trim() || process.env.MATRIX_TRIP_ID?.trim() || "";
if (!tripId) throw new Error("trip id required");

const url = process.env.SUPABASE_URL.trim();
const anon = process.env.SUPABASE_ANON_KEY.trim();
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const PASS = process.env.E2E_SMOKE_PASSWORD.trim();
const instituteId = "32e6db7a-e8c5-4b42-984d-a70c653d10a2";
const vehId = "d3b3706a-0a08-4e14-97b6-fc5ab15eef37";
const drvId = "4b533f2c-2791-4a8d-9b98-681326506f39";

const results = [];
const rec = (id, status, detail = "") => {
  results.push({ id, status, detail });
  console.log(`${id}: ${status}${detail ? ` — ${detail}` : ""}`);
};

const { data: auth, error: authErr } = await admin.auth.signInWithPassword({
  email: "smoke.staging.transport.rt.parent@lumenx.test",
  password: PASS,
});
if (authErr) throw authErr;
const parentToken = auth.session.access_token;
const parentUid = auth.user.id;

async function asParent() {
  const c = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${parentToken}` } },
  });
  await c.auth.setSession({
    access_token: parentToken,
    refresh_token: auth.session.refresh_token,
  });
  return c;
}

await admin.from("vehicle_location").insert({
  institute_id: instituteId,
  trip_id: tripId,
  vehicle_id: vehId,
  driver_id: drvId,
  latitude: 17.3861,
  longitude: 78.4871,
  accuracy_m: 5,
});

let c = await asParent();
let { data } = await c.from("vehicle_location").select("id").eq("trip_id", tripId);
rec(
  "parent_gps_active_trip",
  (data?.length ?? 0) > 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

await admin
  .from("transport_trip")
  .update({
    phase: "completed",
    finalized: true,
    completed_at: new Date().toISOString(),
  })
  .eq("id", tripId);
c = await asParent();
({ data } = await c.from("vehicle_location").select("id").eq("trip_id", tripId));
rec(
  "parent_gps_completed_trip_denied",
  (data?.length ?? 0) === 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

await admin
  .from("transport_trip")
  .update({ phase: "running", finalized: false, completed_at: null })
  .eq("id", tripId);

const { data: mem } = await admin
  .from("membership")
  .select("id, status")
  .eq("user_id", parentUid)
  .eq("institute_id", instituteId)
  .single();
await admin.from("membership").update({ status: "inactive" }).eq("id", mem.id);
c = await asParent();
({ data } = await c.from("vehicle_location").select("id").eq("trip_id", tripId));
rec(
  "parent_gps_membership_revoked_denied",
  (data?.length ?? 0) === 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);
await admin.from("membership").update({ status: mem.status }).eq("id", mem.id);
c = await asParent();
({ data } = await c.from("vehicle_location").select("id").eq("trip_id", tripId));
rec(
  "parent_gps_membership_restored",
  (data?.length ?? 0) > 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

await admin
  .from("transport_trip")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", tripId);
c = await asParent();
({ data } = await c.from("vehicle_location").select("id").eq("trip_id", tripId));
rec(
  "parent_gps_deleted_trip_denied",
  (data?.length ?? 0) === 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

c = await asParent();
({ data } = await c
  .from("transport_trip")
  .select("id")
  .eq("institute_id", instituteId)
  .limit(3));
rec(
  "parent_trip_select_denied",
  (data?.length ?? 0) === 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

const { data: iso } = await admin.auth.signInWithPassword({
  email: "smoke.connect.parent.b@lumenx.test",
  password: PASS,
});
const ic = createClient(url, anon, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${iso.session.access_token}` } },
});
await ic.auth.setSession({
  access_token: iso.session.access_token,
  refresh_token: iso.session.refresh_token,
});
({ data } = await ic
  .from("vehicle_location")
  .select("id")
  .eq("institute_id", instituteId)
  .limit(5));
rec(
  "isolation_parent_gps_select",
  (data?.length ?? 0) === 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

const ac = createClient(url, anon, { auth: { persistSession: false } });
({ data } = await ac
  .from("vehicle_location")
  .select("id")
  .eq("institute_id", instituteId)
  .limit(3));
rec(
  "anon_gps_select",
  (data?.length ?? 0) === 0 ? "PASS" : "FAIL",
  `rows=${data?.length ?? 0}`,
);

const fail = results.filter((r) => r.status === "FAIL").length;
console.log(
  "=== MATRIX ===",
  JSON.stringify({
    PASS: results.filter((r) => r.status === "PASS").length,
    FAIL: fail,
  }),
);
process.exit(fail ? 1 : 0);
