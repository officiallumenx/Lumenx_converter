/**
 * Provision an isolated Transport Playwright institute + driver stack.
 * Touches only "LumenX Transport Playwright Institute" / phone 9000000094.
 * Requires remote-write ack (same as smoke:login). Never prints secrets.
 *
 * Usage:
 *   node e2e/transport/provision-fixture.mjs
 *   node e2e/transport/provision-fixture.mjs --reset-trips
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertRemoteWriteAck } from "../../backend/scripts/assert-remote-write-ack.mjs";
import { loadLumenxDotenv } from "../../backend/scripts/load-lumenx-dotenv.mjs";

loadLumenxDotenv();
assertRemoteWriteAck(process.env, {
  purpose: "transport playwright fixture (dedicated institute only)",
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, ".fixture.json");
const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";

const INST_NAME = "LumenX Transport Playwright Institute";
const INST_CODE = "lx-transport-pw";
const DRIVER_PHONE = "9000000094";
const DRIVER_PIN = (process.env.E2E_TRANSPORT_DRIVER_PIN ?? "1234").trim();
const DRIVER_EMAIL = "smoke.transport.pw.driver@lumenx.test";
const ADMIN_EMAIL = "smoke.transport.pw.admin@lumenx.test";
const ADMIN_PASSWORD = process.env.E2E_SMOKE_PASSWORD?.trim() || "E2eSmoke!2026";
const ADMIN_PIN = (process.env.E2E_TRANSPORT_ADMIN_PIN ?? "1234").trim();
const STUDENT_EMAIL = "smoke.transport.pw.student@lumenx.test";
const STUDENT2_EMAIL = "smoke.transport.pw.student2@lumenx.test";
const VEHICLE_NUMBER = "E2E-BUS-01";
const ROUTE_NAME = "E2E Playwright Route";
const ADMIN_PHONE = "9000000095";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function todayKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

function pinHash(pin) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return { salt, hash };
}

async function ensureAuthUser(email, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: "E2eSmoke!2026",
      email_confirm: true,
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "E2eSmoke!2026",
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(error?.message ?? `createUser ${email}`);
  return data.user.id;
}

async function ensureUserProfile(userId, email, displayName) {
  const { data: existing } = await admin
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("user_profile")
      .update({
        email,
        display_name: displayName,
        status: "active",
        deleted_at: null,
      })
      .eq("id", userId);
    return;
  }
  const { error } = await admin.from("user_profile").insert({
    id: userId,
    email,
    display_name: displayName,
    status: "active",
  });
  if (error) throw new Error(`user_profile: ${error.message}`);
}

async function ensureMembership(userId, instituteId, roleCode) {
  let { data: mem } = await admin
    .from("membership")
    .select("id, status, deleted_at")
    .eq("user_id", userId)
    .eq("institute_id", instituteId)
    .maybeSingle();
  if (!mem) {
    const ins = await admin
      .from("membership")
      .insert({ user_id: userId, institute_id: instituteId, status: "active" })
      .select("id")
      .single();
    if (ins.error) throw new Error(`membership: ${ins.error.message}`);
    mem = ins.data;
  } else if (mem.status !== "active" || mem.deleted_at) {
    await admin
      .from("membership")
      .update({ status: "active", deleted_at: null })
      .eq("id", mem.id);
  }
  const { data: role } = await admin
    .from("membership_role")
    .select("membership_id")
    .eq("membership_id", mem.id)
    .eq("role_code", roleCode)
    .maybeSingle();
  if (!role) {
    const { error } = await admin
      .from("membership_role")
      .insert({ membership_id: mem.id, role_code: roleCode });
    if (error) throw new Error(`membership_role: ${error.message}`);
  }
}

async function ensureInstitute() {
  const { data: existing } = await admin
    .from("institute")
    .select("id, name, code")
    .eq("code", INST_CODE)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("institute")
    .insert({
      code: INST_CODE,
      name: INST_NAME,
      kind: "school",
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`institute: ${error.message}`);

  await admin.from("institute_settings").upsert(
    {
      institute_id: data.id,
      timezone: "Asia/Kolkata",
    },
    { onConflict: "institute_id" },
  );
  return data.id;
}

async function ensureVehicle(instituteId) {
  const { data: existing } = await admin
    .from("vehicle")
    .select("id, vehicle_number")
    .eq("institute_id", instituteId)
    .eq("vehicle_number", VEHICLE_NUMBER)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) return existing;

  const { data, error } = await admin
    .from("vehicle")
    .insert({
      institute_id: instituteId,
      vehicle_number: VEHICLE_NUMBER,
      registration_number: "E2E-REG-01",
      capacity: 20,
      status: "active",
    })
    .select("id, vehicle_number")
    .single();
  if (error) throw new Error(`vehicle: ${error.message}`);
  return data;
}

async function ensureDriver(instituteId, vehicleId, userId) {
  const { salt, hash } = pinHash(DRIVER_PIN);
  const { data: existing } = await admin
    .from("driver")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("phone", DRIVER_PHONE)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await admin
      .from("driver")
      .update({
        display_name: "E2E Transport Driver",
        phone: DRIVER_PHONE,
        status: "active",
        assigned_vehicle_id: vehicleId,
        user_profile_id: userId,
        app_pin_hash: hash,
        app_pin_salt: salt,
        license_number: "E2E-DL-0094",
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`driver update: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await admin
    .from("driver")
    .insert({
      institute_id: instituteId,
      user_profile_id: userId,
      display_name: "E2E Transport Driver",
      phone: DRIVER_PHONE,
      license_number: "E2E-DL-0094",
      status: "active",
      app_pin_hash: hash,
      app_pin_salt: salt,
      assigned_vehicle_id: vehicleId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`driver: ${error.message}`);
  return data.id;
}

async function ensureRoute(instituteId, vehicleId, driverId) {
  const { data: existing } = await admin
    .from("route")
    .select("id, name")
    .eq("institute_id", instituteId)
    .eq("name", ROUTE_NAME)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("route")
      .update({
        vehicle_id: vehicleId,
        driver_id: driverId,
        status: "active",
        config_status: "configured",
        approval_status: "approved",
        deleted_at: null,
      })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("route")
    .insert({
      institute_id: instituteId,
      name: ROUTE_NAME,
      vehicle_id: vehicleId,
      driver_id: driverId,
      status: "active",
      config_status: "configured",
      approval_status: "approved",
    })
    .select("id")
    .single();
  if (error) throw new Error(`route: ${error.message}`);
  return data.id;
}

async function ensureStops(instituteId, routeId) {
  const { data: existing } = await admin
    .from("stop")
    .select("id, name, kind, route_order")
    .eq("route_id", routeId)
    .is("deleted_at", null)
    .order("route_order", { ascending: true });
  if (existing?.length >= 2) {
    const pickup = existing.find((s) => s.kind !== "school") ?? existing[0];
    const school =
      existing.find((s) => s.kind === "school") ?? existing[existing.length - 1];
    return { pickupStopId: pickup.id, schoolStopId: school.id };
  }

  const { data: pickup, error: pErr } = await admin
    .from("stop")
    .insert({
      institute_id: instituteId,
      route_id: routeId,
      name: "E2E Gate",
      location_label: "E2E Gate",
      latitude: 17.385,
      longitude: 78.4867,
      route_order: 0,
      notification_radius_m: 80,
      kind: "waypoint",
      approval_status: "approved",
    })
    .select("id")
    .single();
  if (pErr) throw new Error(`pickup stop: ${pErr.message}`);

  const { data: school, error: sErr } = await admin
    .from("stop")
    .insert({
      institute_id: instituteId,
      route_id: routeId,
      name: "E2E School",
      location_label: "E2E School",
      latitude: 17.39,
      longitude: 78.49,
      route_order: 1,
      notification_radius_m: 80,
      kind: "school",
      approval_status: "approved",
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`school stop: ${sErr.message}`);

  return { pickupStopId: pickup.id, schoolStopId: school.id };
}

async function ensureStudent(instituteId, email, displayName, first, surname) {
  const userId = await ensureAuthUser(email, displayName);
  await ensureUserProfile(userId, email, displayName);
  const { data: existing } = await admin
    .from("student")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await admin
    .from("student")
    .insert({
      institute_id: instituteId,
      user_profile_id: userId,
      first_name: first,
      surname,
      display_name: displayName,
      gender: "other",
      address: "E2E address",
      status: "active",
      access_status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`student ${email}: ${error.message}`);
  return data.id;
}

async function ensureInstituteAdmin(instituteId) {
  const userId = await ensureAuthUser(ADMIN_EMAIL, "E2E Transport Admin");
  await ensureUserProfile(userId, ADMIN_EMAIL, "E2E Transport Admin");
  // Phone on profile helps staff login resolve identifier.
  await admin
    .from("user_profile")
    .update({
      phone: ADMIN_PHONE,
      status: "active",
      deleted_at: null,
    })
    .eq("id", userId);
  await ensureMembership(userId, instituteId, "institute_admin");

  const { salt, hash } = pinHash(ADMIN_PIN);
  const now = new Date().toISOString();
  const { error } = await admin
    .from("user_profile")
    .update({
      pin_hash: hash,
      pin_salt: salt,
      pin_set_at: now,
      first_login_completed_at: now,
      phone_verified_at: now,
      email_verified_at: now,
      username: "e2e_transport_pw_admin",
    })
    .eq("id", userId);
  if (error) throw new Error(`admin pin: ${error.message}`);
  return userId;
}

async function softDeleteE2ePendingStops(routeId) {
  const { data, error } = await admin
    .from("stop")
    .update({ deleted_at: new Date().toISOString() })
    .eq("route_id", routeId)
    .in("approval_status", ["pending", "rejected"])
    .ilike("name", "E2E QA%")
    .is("deleted_at", null)
    .select("id, name, approval_status");
  if (error) throw new Error(`cleanup pending stops: ${error.message}`);
  return data ?? [];
}

async function ensureEnrollment(
  instituteId,
  routeId,
  studentId,
  pickupStopId,
  dropStopId,
) {
  const { data: existing } = await admin
    .from("transport_enrollment")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("student_id", studentId)
    .eq("route_id", routeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("transport_enrollment")
      .update({
        pickup_stop_id: pickupStopId,
        drop_stop_id: dropStopId,
        status: "active",
        approval_status: "approved",
        deleted_at: null,
      })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("transport_enrollment")
    .insert({
      institute_id: instituteId,
      student_id: studentId,
      route_id: routeId,
      pickup_stop_id: pickupStopId,
      drop_stop_id: dropStopId,
      status: "active",
      approval_status: "approved",
    })
    .select("id")
    .single();
  if (error) throw new Error(`enrollment: ${error.message}`);
  return data.id;
}

async function resetTodayTrips(vehicleId) {
  const today = todayKolkata();
  const { data, error } = await admin
    .from("transport_trip")
    .update({ deleted_at: new Date().toISOString() })
    .eq("vehicle_id", vehicleId)
    .eq("trip_date", today)
    .is("deleted_at", null)
    .select("id, slot");
  if (error) throw new Error(`reset trips: ${error.message}`);
  return data ?? [];
}

async function verifyPinLogin(instituteId) {
  const res = await fetch(`${API}/api/v1/auth/transport/pin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      phone: DRIVER_PHONE,
      pin: DRIVER_PIN,
      institute_id: instituteId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `pin-login failed HTTP ${res.status}: ${json?.error?.message ?? "unknown"}`,
    );
  }
  return Boolean(json?.data?.access_token);
}

async function verifyAdminPasswordLogin() {
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!anonKey || !SUPABASE_URL) return false;
  const anon = createClient(SUPABASE_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.session?.access_token) {
    throw new Error(`admin password login: ${error?.message ?? "no session"}`);
  }
  return true;
}

async function main() {
  const resetTrips = process.argv.includes("--reset-trips");
  const resetPending = process.argv.includes("--reset-pending-stops");
  const instituteId = await ensureInstitute();
  const vehicle = await ensureVehicle(instituteId);
  const driverUserId = await ensureAuthUser(DRIVER_EMAIL, "E2E Transport Driver");
  await ensureUserProfile(driverUserId, DRIVER_EMAIL, "E2E Transport Driver");
  await ensureMembership(driverUserId, instituteId, "driver");
  const driverId = await ensureDriver(instituteId, vehicle.id, driverUserId);
  const routeId = await ensureRoute(instituteId, vehicle.id, driverId);
  const stops = await ensureStops(instituteId, routeId);
  const studentId = await ensureStudent(
    instituteId,
    STUDENT_EMAIL,
    "E2E Rider",
    "E2E",
    "Rider",
  );
  // Distinct pickup vs drop so drop-stop assertions are meaningful.
  const enrollmentId = await ensureEnrollment(
    instituteId,
    routeId,
    studentId,
    stops.pickupStopId,
    stops.schoolStopId,
  );
  // Second student enrolled without pickup — eligible for new stop assignment.
  const student2Id = await ensureStudent(
    instituteId,
    STUDENT2_EMAIL,
    "E2E Rider Two",
    "E2E",
    "Two",
  );
  const enrollment2Id = await ensureEnrollment(
    instituteId,
    routeId,
    student2Id,
    null,
    stops.schoolStopId,
  );

  const adminUserId = await ensureInstituteAdmin(instituteId);

  let cleared = [];
  let clearedStops = [];
  if (resetTrips) {
    cleared = await resetTodayTrips(vehicle.id);
  }
  if (resetPending) {
    clearedStops = await softDeleteE2ePendingStops(routeId);
  }

  await verifyPinLogin(instituteId);
  await verifyAdminPasswordLogin();

  const fixture = {
    instituteId,
    instituteName: INST_NAME,
    driverPhone: DRIVER_PHONE,
    driverPin: DRIVER_PIN,
    driverId,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
    adminPin: ADMIN_PIN,
    adminUserId,
    vehicleId: vehicle.id,
    vehicleNumber: VEHICLE_NUMBER,
    routeId,
    routeName: ROUTE_NAME,
    pickupStopId: stops.pickupStopId,
    dropStopId: stops.schoolStopId,
    studentId,
    enrollmentId,
    student2Id,
    enrollment2Id,
    student2Name: "E2E Rider Two",
    serviceDate: todayKolkata(),
    apiBaseUrl: API,
    adminBaseUrl: "http://127.0.0.1:4181",
    transportBaseUrl: "http://127.0.0.1:4184",
    clearedTripSlots: cleared.map((t) => t.slot),
    clearedPendingStops: clearedStops.map((s) => s.name),
    provisionedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        fixturePath: FIXTURE_PATH,
        instituteId: fixture.instituteId,
        vehicleNumber: fixture.vehicleNumber,
        serviceDate: fixture.serviceDate,
        clearedTrips: fixture.clearedTripSlots.length,
        clearedPendingStops: fixture.clearedPendingStops.length,
        pinLogin: "ok",
        adminLogin: "ok",
        adminEmail: ADMIN_EMAIL,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("PROVISION_FAILED", err instanceof Error ? err.message : err);
  process.exit(1);
});
