/**
 * Staging-only: ensure lx-staging-transport-rt route has S1→S2→S3 + School
 * and enrollments A→S1, B→S2, C→S3. Idempotent. Never prints secrets.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/ensure-staging-rt-three-stops.mjs
 */
import { createClient } from "@supabase/supabase-js";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

const EXPECTED_REF = "yveadybpntziyryxsrsu";
const DENIED_REF = "kmpzflsurepjwqnfqyld";
const INST_CODE = "lx-staging-transport-rt";
const ROUTE_NAME = "Staging RT Route";

const STOPS = [
  {
    name: "STG RT S1",
    lat: 17.385,
    lng: 78.4867,
    order: 0,
    kind: "waypoint",
    aliases: ["STG RT Pickup", "STG RT S1"],
  },
  {
    name: "STG RT S2",
    lat: 17.3872,
    lng: 78.4895,
    order: 1,
    kind: "waypoint",
    aliases: ["STG RT S2"],
  },
  {
    name: "STG RT S3",
    lat: 17.3888,
    lng: 78.4922,
    order: 2,
    kind: "waypoint",
    aliases: ["STG RT S3"],
  },
  {
    name: "STG RT School",
    lat: 17.39,
    lng: 78.49,
    order: 3,
    kind: "school",
    aliases: ["STG RT School"],
  },
];

const CHILD_EMAILS = [
  "smoke.staging.transport.rt.child1@lumenx.test",
  "smoke.staging.transport.rt.child2@lumenx.test",
  "smoke.staging.transport.rt.child3@lumenx.test",
];

function fail(msg) {
  console.error(`BLOCKED: ${msg}`);
  process.exit(2);
}

assertStagingEnv(process.env);
const url = (process.env.SUPABASE_URL || "").trim();
const ref = extractSupabaseProjectRef(url);
if (ref !== EXPECTED_REF) fail(`SUPABASE_URL ref must be ${EXPECTED_REF}`);
if (ref === DENIED_REF) fail("Denylisted production project");
console.log(`Staging identity OK ref=${ref}`);

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: inst, error: instErr } = await admin
  .from("institute")
  .select("id,code")
  .eq("code", INST_CODE)
  .is("deleted_at", null)
  .maybeSingle();
if (instErr) fail(`institute: ${instErr.message}`);
if (!inst?.id) fail(`Institute ${INST_CODE} missing — run transport-realtime-probe first`);

const { data: route, error: routeErr } = await admin
  .from("route")
  .select("id,name,driver_id,vehicle_id,approval_status,status")
  .eq("institute_id", inst.id)
  .eq("name", ROUTE_NAME)
  .is("deleted_at", null)
  .maybeSingle();
if (routeErr) fail(`route: ${routeErr.message}`);
if (!route?.id) fail(`Route ${ROUTE_NAME} missing`);

async function ensureStop(spec) {
  const { data: existingRows, error } = await admin
    .from("stop")
    .select("id,name,route_order,kind,deleted_at")
    .eq("route_id", route.id)
    .in("name", spec.aliases)
    .is("deleted_at", null);
  if (error) fail(`stop list ${spec.name}: ${error.message}`);

  let row = (existingRows || [])[0];
  if (!row) {
    const { data, error: insErr } = await admin
      .from("stop")
      .insert({
        institute_id: inst.id,
        route_id: route.id,
        name: spec.name,
        location_label: spec.name,
        latitude: spec.lat,
        longitude: spec.lng,
        route_order: spec.order,
        notification_radius_m: 120,
        kind: spec.kind,
        approval_status: "approved",
      })
      .select("id,name,route_order,kind")
      .single();
    if (insErr) fail(`stop insert ${spec.name}: ${insErr.message}`);
    row = data;
    console.log(`stop.create ${spec.name} order=${spec.order}`);
  } else {
    const { error: updErr } = await admin
      .from("stop")
      .update({
        name: spec.name,
        location_label: spec.name,
        latitude: spec.lat,
        longitude: spec.lng,
        route_order: spec.order,
        kind: spec.kind,
        approval_status: "approved",
        notification_radius_m: 120,
        deleted_at: null,
      })
      .eq("id", row.id);
    if (updErr) fail(`stop update ${spec.name}: ${updErr.message}`);
    console.log(`stop.ensure ${spec.name} order=${spec.order} id=${row.id}`);
  }
  return row.id;
}

// Clear route_order collisions before writing final S1→S2→S3→School sequence
{
  const { data: liveStops, error } = await admin
    .from("stop")
    .select("id,name,route_order")
    .eq("route_id", route.id)
    .is("deleted_at", null);
  if (error) fail(`pre-shift stops: ${error.message}`);
  let temp = 900;
  for (const s of liveStops || []) {
    const { error: shiftErr } = await admin
      .from("stop")
      .update({ route_order: temp++ })
      .eq("id", s.id);
    if (shiftErr) fail(`pre-shift ${s.name}: ${shiftErr.message}`);
  }
  console.log(`stop.pre_shift count=${(liveStops || []).length}`);
}

const stopIds = {};
for (const spec of STOPS) {
  stopIds[spec.name] = await ensureStop(spec);
}

// Soft-delete any other live stops on this route that are not in the S1–S3+School set
const keepNames = new Set(STOPS.map((s) => s.name));
const { data: allStops } = await admin
  .from("stop")
  .select("id,name")
  .eq("route_id", route.id)
  .is("deleted_at", null);
for (const s of allStops || []) {
  if (!keepNames.has(s.name)) {
    await admin
      .from("stop")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", s.id);
    console.log(`stop.retire ${s.name}`);
  }
}

// Map children by email → student via user_profile
const pickupByChild = [
  stopIds["STG RT S1"],
  stopIds["STG RT S2"],
  stopIds["STG RT S3"],
];
const schoolId = stopIds["STG RT School"];

for (let i = 0; i < CHILD_EMAILS.length; i++) {
  const email = CHILD_EMAILS[i];
  const { data: profile } = await admin
    .from("user_profile")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!profile?.id) fail(`profile missing for ${email}`);

  const { data: student } = await admin
    .from("student")
    .select("id")
    .eq("institute_id", inst.id)
    .eq("user_profile_id", profile.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!student?.id) fail(`student missing for ${email}`);

  const { data: enr } = await admin
    .from("transport_enrollment")
    .select("id")
    .eq("institute_id", inst.id)
    .eq("student_id", student.id)
    .eq("route_id", route.id)
    .is("deleted_at", null)
    .maybeSingle();

  const patch = {
    pickup_stop_id: pickupByChild[i],
    drop_stop_id: schoolId,
    status: "active",
    approval_status: "approved",
  };

  if (!enr?.id) {
    const { error } = await admin.from("transport_enrollment").insert({
      institute_id: inst.id,
      student_id: student.id,
      route_id: route.id,
      ...patch,
    });
    if (error) fail(`enrollment insert ${email}: ${error.message}`);
    console.log(`enrollment.create child${i + 1} → S${i + 1}`);
  } else {
    const { error } = await admin
      .from("transport_enrollment")
      .update(patch)
      .eq("id", enr.id);
    if (error) fail(`enrollment update ${email}: ${error.message}`);
    console.log(`enrollment.ensure child${i + 1} → S${i + 1}`);
  }
}

const { data: finalStops } = await admin
  .from("stop")
  .select("name,route_order,kind")
  .eq("route_id", route.id)
  .is("deleted_at", null)
  .order("route_order");

console.log(
  JSON.stringify(
    {
      institute: INST_CODE,
      route_id: route.id,
      stops: finalStops,
      mapping: {
        child1: "STG RT S1",
        child2: "STG RT S2",
        child3: "STG RT S3",
        drop: "STG RT School",
      },
      sequential_ready:
        (finalStops || []).length >= 4 &&
        (finalStops || [])[0]?.name === "STG RT S1" &&
        (finalStops || [])[1]?.name === "STG RT S2" &&
        (finalStops || [])[2]?.name === "STG RT S3",
    },
    null,
    2,
  ),
);
