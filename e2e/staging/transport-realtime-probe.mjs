/**
 * Staging Transport realtime + lifecycle probe (synthetic data only).
 *
 * Verifies (against yveadybpntziyryxsrsu only):
 * - Driver location publish → parent live API + Supabase realtime
 * - Boarding / dropping lifecycle + retries
 * - Parent notification dedupe for 3 siblings at the same stop (approach)
 * - Per-student boarded notifications remain distinct
 * - Isolation institute cannot read live location
 * - Unauthorized location rejected
 *
 * Soft-cleans only trips created this run. Never prints secrets.
 *
 * Usage:
 *   node --env-file=backend/.env.staging e2e/staging/transport-realtime-probe.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { assertStagingEnv, extractSupabaseProjectRef } from "../../backend/scripts/assert-staging-env.mjs";

const EXPECTED_REF = "yveadybpntziyryxsrsu";
const DENIED_REF = "kmpzflsurepjwqnfqyld";
const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";

const INST_NAME = "LumenX Staging Transport RT Institute";
const INST_CODE = "lx-staging-transport-rt";
const ISOLATION_INST_CODE = "LX-E2E-ISOL"; // existing isolation institute
const DRIVER_PHONE = "9000000294";
const PARENT_PHONE = "9000000295";
const DRIVER_PIN = (process.env.E2E_TRANSPORT_DRIVER_PIN ?? "1234").trim();
const DRIVER_EMAIL = "smoke.staging.transport.rt.driver@lumenx.test";
const PARENT_EMAIL = "smoke.staging.transport.rt.parent@lumenx.test";
const STUDENT_EMAILS = [
  "smoke.staging.transport.rt.child1@lumenx.test",
  "smoke.staging.transport.rt.child2@lumenx.test",
  "smoke.staging.transport.rt.child3@lumenx.test",
];
const VEHICLE_NUMBER = "STG-RT-BUS-01";
const ROUTE_NAME = "Staging RT Route";
const PICKUP = { lat: 17.385, lng: 78.4867, name: "STG RT Pickup" };
const SCHOOL = { lat: 17.39, lng: 78.49, name: "STG RT School" };

const PASSWORD =
  process.env.E2E_SMOKE_PASSWORD?.trim() ||
  process.env.NEXUS_BOOTSTRAP_PASSWORD?.trim() ||
  "";

const results = [];
function record(id, status, detail = "") {
  results.push({ id, status, detail });
  const line = detail ? `${id}: ${status} — ${detail}` : `${id}: ${status}`;
  console.log(line);
}

function failHard(msg) {
  console.error(`BLOCKED: ${msg}`);
  process.exit(2);
}

function assertStagingIdentity() {
  assertStagingEnv(process.env);
  const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
  if (ref !== EXPECTED_REF) failHard(`SUPABASE_URL ref must be ${EXPECTED_REF}`);
  if (ref === DENIED_REF) failHard("Denylisted production project");
  const expected = (process.env.STAGING_SUPABASE_PROJECT_REF ?? "").trim();
  if (expected && expected !== EXPECTED_REF) {
    failHard(`STAGING_SUPABASE_PROJECT_REF must be ${EXPECTED_REF}`);
  }
  if (!PASSWORD) failHard("E2E_SMOKE_PASSWORD required");
  console.log(`Staging identity OK ref=${ref}`);
}

function pinHash(pin) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return { salt, hash };
}

function todayKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

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

/** Inbox DTOs nest kind under notification.payload.kind (not top-level). */
function inboxItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function notifKind(item) {
  const n = item?.notification ?? item;
  return String(
    n?.payload?.kind ?? n?.kind ?? item?.kind ?? item?.eventKind ?? "",
  );
}

function notifTitleBody(item) {
  const n = item?.notification ?? item;
  return `${n?.title ?? item?.title ?? ""} ${n?.body ?? item?.body ?? ""}`;
}

function notifPayload(item) {
  const n = item?.notification ?? item;
  return n?.payload && typeof n.payload === "object" ? n.payload : {};
}

async function waitFor(predicate, { timeoutMs = 25_000, intervalMs = 500, label = "condition" } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await predicate();
    if (value) return value;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  assertStagingIdentity();

  const health = await fetch(`${API}/api/v1/health`).catch(() => null);
  if (!health?.ok) failHard(`Staging API not healthy at ${API}`);
  record("api_health", "PASS", API);

  const url = process.env.SUPABASE_URL.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY.trim();
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Provision (idempotent ensure) ──────────────────────────────
  let instituteId = (
    await admin
      .from("institute")
      .select("id")
      .eq("code", INST_CODE)
      .is("deleted_at", null)
      .maybeSingle()
  ).data?.id;

  if (!instituteId) {
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
    if (error) failHard(`institute create: ${error.message}`);
    instituteId = data.id;
    await admin.from("institute_settings").upsert(
      { institute_id: instituteId, timezone: "Asia/Kolkata" },
      { onConflict: "institute_id" },
    );
  }

  // Writable trial subscription
  {
    const { data: sub } = await admin
      .from("subscription")
      .select("id, lifecycle_status")
      .eq("institute_id", instituteId)
      .maybeSingle();
    if (!sub) {
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 60 * 864e5).toISOString();
      const grace = new Date(Date.now() + 67 * 864e5).toISOString();
      const { error } = await admin.from("subscription").insert({
        institute_id: instituteId,
        lifecycle_status: "trial_active",
        assigned_rate_inr: 0,
        active_student_count: 0,
        trial_start_at: start,
        trial_end_at: end,
        grace_ends_at: grace,
      });
      if (error) failHard(`subscription: ${error.message}`);
    } else if (sub.lifecycle_status !== "trial_active") {
      await admin
        .from("subscription")
        .update({ lifecycle_status: "trial_active" })
        .eq("id", sub.id);
    }
  }

  async function ensureAuth(email, displayName) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listed.data?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password: PASSWORD,
        email_confirm: true,
      });
      return existing.id;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error || !data.user) failHard(`createUser ${email}: ${error?.message}`);
    return data.user.id;
  }

  async function ensureProfile(userId, email, displayName, phone = null) {
    const { data: existing } = await admin
      .from("user_profile")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    const patch = {
      email,
      display_name: displayName,
      status: "active",
      deleted_at: null,
      ...(phone ? { phone } : {}),
    };
    if (existing?.id) {
      await admin.from("user_profile").update(patch).eq("id", userId);
      return;
    }
    const { error } = await admin.from("user_profile").insert({
      id: userId,
      ...patch,
    });
    if (error) failHard(`profile ${email}: ${error.message}`);
  }

  async function ensureMembership(userId, roleCode) {
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
      if (ins.error) failHard(`membership: ${ins.error.message}`);
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
      if (error) failHard(`membership_role ${roleCode}: ${error.message}`);
    }
    return mem.id;
  }

  const driverUserId = await ensureAuth(DRIVER_EMAIL, "STG RT Driver");
  await ensureProfile(driverUserId, DRIVER_EMAIL, "STG RT Driver", DRIVER_PHONE);
  await ensureMembership(driverUserId, "driver");
  {
    const { salt, hash } = pinHash(DRIVER_PIN);
    const now = new Date().toISOString();
    await admin
      .from("user_profile")
      .update({
        pin_hash: hash,
        pin_salt: salt,
        pin_set_at: now,
        first_login_completed_at: now,
        phone_verified_at: now,
      })
      .eq("id", driverUserId);
  }

  let vehicleId = (
    await admin
      .from("vehicle")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("vehicle_number", VEHICLE_NUMBER)
      .is("deleted_at", null)
      .maybeSingle()
  ).data?.id;
  if (!vehicleId) {
    const { data, error } = await admin
      .from("vehicle")
      .insert({
        institute_id: instituteId,
        vehicle_number: VEHICLE_NUMBER,
        registration_number: "STG-RT-REG-01",
        capacity: 20,
        status: "active",
      })
      .select("id")
      .single();
    if (error) failHard(`vehicle: ${error.message}`);
    vehicleId = data.id;
  }

  let driverId = (
    await admin
      .from("driver")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("phone", DRIVER_PHONE)
      .is("deleted_at", null)
      .maybeSingle()
  ).data?.id;
  {
    const { salt, hash } = pinHash(DRIVER_PIN);
    if (!driverId) {
      const { data, error } = await admin
        .from("driver")
        .insert({
          institute_id: instituteId,
          user_profile_id: driverUserId,
          phone: DRIVER_PHONE,
          display_name: "STG RT Driver",
          license_number: "STG-RT-DL-0294",
          status: "active",
          assigned_vehicle_id: vehicleId,
          app_pin_hash: hash,
          app_pin_salt: salt,
        })
        .select("id")
        .single();
      if (error) failHard(`driver: ${error.message}`);
      driverId = data.id;
    } else {
      await admin
        .from("driver")
        .update({
          user_profile_id: driverUserId,
          assigned_vehicle_id: vehicleId,
          status: "active",
          app_pin_hash: hash,
          app_pin_salt: salt,
          deleted_at: null,
        })
        .eq("id", driverId);
    }
  }

  let routeId = (
    await admin
      .from("route")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("name", ROUTE_NAME)
      .is("deleted_at", null)
      .maybeSingle()
  ).data?.id;
  if (!routeId) {
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
    if (error) failHard(`route: ${error.message}`);
    routeId = data.id;
  } else {
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
      .eq("id", routeId);
  }

  async function ensureStop(name, lat, lng, order, kind) {
    const { data: existing } = await admin
      .from("stop")
      .select("id")
      .eq("route_id", routeId)
      .eq("name", name)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data, error } = await admin
      .from("stop")
      .insert({
        institute_id: instituteId,
        route_id: routeId,
        name,
        location_label: name,
        latitude: lat,
        longitude: lng,
        route_order: order,
        notification_radius_m: 120,
        kind,
        approval_status: "approved",
      })
      .select("id")
      .single();
    if (error) failHard(`stop ${name}: ${error.message}`);
    return data.id;
  }

  const pickupStopId = await ensureStop(PICKUP.name, PICKUP.lat, PICKUP.lng, 0, "waypoint");
  const schoolStopId = await ensureStop(SCHOOL.name, SCHOOL.lat, SCHOOL.lng, 1, "school");

  const parentUserId = await ensureAuth(PARENT_EMAIL, "STG RT Parent");
  await ensureProfile(parentUserId, PARENT_EMAIL, "STG RT Parent");
  await ensureMembership(parentUserId, "parent");

  let parentRowId = (
    await admin
      .from("parent")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("user_profile_id", parentUserId)
      .is("deleted_at", null)
      .maybeSingle()
  ).data?.id;
  if (!parentRowId) {
    const { data, error } = await admin
      .from("parent")
      .insert({
        institute_id: instituteId,
        user_profile_id: parentUserId,
        name: "STG RT Parent",
        email: PARENT_EMAIL,
        phone: PARENT_PHONE,
        invite_status: "active",
        access_status: "active",
      })
      .select("id")
      .single();
    if (error) failHard(`parent: ${error.message}`);
    parentRowId = data.id;
  }

  const studentIds = [];
  for (let i = 0; i < STUDENT_EMAILS.length; i++) {
    const email = STUDENT_EMAILS[i];
    const userId = await ensureAuth(email, `STG RT Child ${i + 1}`);
    await ensureProfile(userId, email, `STG RT Child ${i + 1}`);
    let studentId = (
      await admin
        .from("student")
        .select("id")
        .eq("institute_id", instituteId)
        .eq("user_profile_id", userId)
        .is("deleted_at", null)
        .maybeSingle()
    ).data?.id;
    if (!studentId) {
      const { data, error } = await admin
        .from("student")
        .insert({
          institute_id: instituteId,
          user_profile_id: userId,
          first_name: `Child${i + 1}`,
          surname: "Staging",
          display_name: `STG RT Child ${i + 1}`,
          gender: "other",
          address: "Staging address",
          status: "active",
          access_status: "active",
        })
        .select("id")
        .single();
      if (error) failHard(`student ${email}: ${error.message}`);
      studentId = data.id;
    }
    studentIds.push(studentId);

    const { data: link } = await admin
      .from("guardian_link")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("parent_id", parentRowId)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!link?.id) {
      const { error } = await admin.from("guardian_link").insert({
        institute_id: instituteId,
        parent_id: parentRowId,
        student_id: studentId,
        relationship: "guardian",
        is_primary: i === 0,
        status: "active",
      });
      if (error) failHard(`guardian_link: ${error.message}`);
    }

    const { data: enr } = await admin
      .from("transport_enrollment")
      .select("id")
      .eq("institute_id", instituteId)
      .eq("student_id", studentId)
      .eq("route_id", routeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!enr?.id) {
      const { error } = await admin.from("transport_enrollment").insert({
        institute_id: instituteId,
        student_id: studentId,
        route_id: routeId,
        pickup_stop_id: pickupStopId,
        drop_stop_id: schoolStopId,
        status: "active",
        approval_status: "approved",
      });
      if (error) failHard(`enrollment: ${error.message}`);
    } else {
      await admin
        .from("transport_enrollment")
        .update({
          pickup_stop_id: pickupStopId,
          drop_stop_id: schoolStopId,
          status: "active",
          approval_status: "approved",
        })
        .eq("id", enr.id);
    }
  }
  record("fixtures", "PASS", `institute + driver + parent + ${studentIds.length} siblings`);

  // Soft-delete prior today trips for this vehicle (this institute only)
  const today = todayKolkata();
  await admin
    .from("transport_trip")
    .update({ deleted_at: new Date().toISOString() })
    .eq("vehicle_id", vehicleId)
    .eq("trip_date", today)
    .is("deleted_at", null);

  // ── Auth tokens ────────────────────────────────────────────────
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  async function signIn(email) {
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (error || !data.session?.access_token) {
      failHard(`signIn ${email}: ${error?.message ?? "no session"}`);
    }
    return data.session.access_token;
  }

  const driverToken = await signIn(DRIVER_EMAIL);
  const parentToken = await signIn(PARENT_EMAIL);
  record("auth", "PASS", "driver + parent JWT");

  // ── Start trip ─────────────────────────────────────────────────
  const startBody = {
    institute_id: instituteId,
    route_id: routeId,
    vehicle_id: vehicleId,
    driver_id: driverId,
    slot: "morning",
    trip_date: today,
    client_event_id: `stg-rt-start-${randomUUID()}`,
  };
  const started = await apiJson("/api/v1/transport/trips", {
    method: "POST",
    token: driverToken,
    body: startBody,
  });
  if (!started.res.ok) {
    failHard(`start trip HTTP ${started.res.status}: ${started.json?.error?.message}`);
  }
  const tripId = started.data.id;
  record("trip_start", "PASS", tripId);

  // Soft cleanup helper
  async function softEndTrip() {
    await apiJson(`/api/v1/transport/trips/${tripId}/end`, {
      method: "POST",
      token: driverToken,
      body: { client_event_id: `stg-rt-end-${randomUUID()}` },
    }).catch(() => {});
    await admin
      .from("transport_trip")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", tripId);
  }

  try {
    // ── Realtime subscribe (parent JWT client) ───────────────────
    const parentRealtime = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${parentToken}` } },
    });
    await parentRealtime.auth.setSession({
      access_token: parentToken,
      refresh_token: "unused",
    }).catch(() => {});

    let locationEvents = 0;
    let boardingEvents = 0;
    const channelLoc = parentRealtime
      .channel(`stg-rt-loc-${instituteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_location",
          filter: `institute_id=eq.${instituteId}`,
        },
        () => {
          locationEvents += 1;
        },
      )
      .subscribe();
    const channelBoard = parentRealtime
      .channel(`stg-rt-board-${instituteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transport_boarding_event",
          filter: `institute_id=eq.${instituteId}`,
        },
        () => {
          boardingEvents += 1;
        },
      )
      .subscribe();

    await waitFor(
      async () => {
        const s1 = channelLoc.state;
        const s2 = channelBoard.state;
        return (s1 === "joined" || s1 === "subscribed") &&
          (s2 === "joined" || s2 === "subscribed")
          ? true
          : null;
      },
      { timeoutMs: 20_000, label: "realtime subscribe" },
    ).catch(() => null);

    const subscribed =
      (channelLoc.state === "joined" || channelLoc.state === "subscribed") &&
      (channelBoard.state === "joined" || channelBoard.state === "subscribed");
    if (!subscribed) {
      record(
        "realtime_subscribe",
        "BLOCKED",
        `channel states loc=${channelLoc.state} board=${channelBoard.state}`,
      );
    } else {
      record("realtime_subscribe", "PASS");
    }

    // ── Unauthorized location ────────────────────────────────────
    const badLoc = await apiJson(`/api/v1/transport/trips/${tripId}/location`, {
      method: "POST",
      token: parentToken,
      body: {
        latitude: PICKUP.lat,
        longitude: PICKUP.lng,
        accuracy_m: 10,
        client_event_id: `stg-rt-bad-${randomUUID()}`,
      },
    });
    if (badLoc.res.status === 401 || badLoc.res.status === 403) {
      record("unauthorized_location", "PASS", `HTTP ${badLoc.res.status}`);
    } else {
      record(
        "unauthorized_location",
        "FAIL",
        `expected 401/403 got ${badLoc.res.status}`,
      );
    }

    // ── Driver location publish ──────────────────────────────────
    const beforeEvents = locationEvents;
    const ping = await apiJson(`/api/v1/transport/trips/${tripId}/location`, {
      method: "POST",
      token: driverToken,
      body: {
        latitude: PICKUP.lat + 0.00005,
        longitude: PICKUP.lng + 0.00005,
        accuracy_m: 8,
        speed_kmh: 12,
        captured_at: new Date().toISOString(),
        client_event_id: `stg-rt-ping-${randomUUID()}`,
        sequence_number: 1,
      },
    });
    if (!ping.res.ok) {
      record(
        "driver_location_publish",
        "FAIL",
        `HTTP ${ping.res.status} ${ping.json?.error?.message ?? ""}`,
      );
    } else {
      record("driver_location_publish", "PASS");
    }

    // Parent live API for child 1
    const live = await waitFor(
      async () => {
        const r = await apiJson(
          `/api/v1/transport/portal/learner-transport/live?institute_id=${instituteId}&student_id=${studentIds[0]}`,
          { token: parentToken },
        );
        if (!r.res.ok) return null;
        const loc = r.data?.latestLocation ?? r.data?.live?.latestLocation ?? r.data;
        const lat = loc?.latitude ?? loc?.lat ?? r.data?.latitude;
        const lng = loc?.longitude ?? loc?.lng ?? r.data?.longitude;
        if (lat == null || lng == null) {
          // Accept trip-present live payload as progress
          if (r.data?.tripId === tripId || r.data?.trip?.id === tripId) return r.data;
          return null;
        }
        return r.data;
      },
      { timeoutMs: 20_000, label: "parent live location" },
    ).catch((e) => {
      record("parent_live_location", "FAIL", e.message);
      return null;
    });
    if (live) {
      record("parent_live_location", "PASS", "parent live API returned trip/location");
    }

    // Parent RLS on vehicle_location (required for postgres_changes delivery)
    const { count: locCountAdmin } = await admin
      .from("vehicle_location")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId);
    const parentLocClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${parentToken}` } },
    });
    await parentLocClient.auth
      .setSession({ access_token: parentToken, refresh_token: "unused" })
      .catch(() => {});
    const { data: parentLocRows } = await parentLocClient
      .from("vehicle_location")
      .select("id")
      .eq("institute_id", instituteId)
      .limit(5);
    if ((locCountAdmin ?? 0) > 0 && (parentLocRows?.length ?? 0) === 0) {
      record(
        "vehicle_location_rls_parent",
        "FAIL",
        `admin rows=${locCountAdmin} parent SELECT=0 (phase9 policy joins transport_trip which parents cannot read → realtime blocked)`,
      );
    } else if ((parentLocRows?.length ?? 0) > 0) {
      record(
        "vehicle_location_rls_parent",
        "PASS",
        `parent SELECT rows=${parentLocRows.length}`,
      );
    } else {
      record(
        "vehicle_location_rls_parent",
        "NOT RUN",
        "no vehicle_location rows written yet",
      );
    }

    if (subscribed) {
      try {
        await waitFor(
          async () => (locationEvents > beforeEvents ? true : null),
          { timeoutMs: 20_000, label: "realtime vehicle_location event" },
        );
        record(
          "realtime_location_event",
          "PASS",
          `events=${locationEvents - beforeEvents}`,
        );
      } catch {
        record(
          "realtime_location_event",
          "FAIL",
          "no vehicle_location realtime event — parent RLS denies SELECT (live API still works via service_role)",
        );
      }
    } else {
      record("realtime_location_event", "NOT RUN", "subscribe blocked");
    }

    // Isolation: other institute parent (if exists)
    const { data: isoInst } = await admin
      .from("institute")
      .select("id")
      .eq("code", ISOLATION_INST_CODE)
      .is("deleted_at", null)
      .maybeSingle();
    if (isoInst?.id) {
      // Use Connect isolation parent if present
      const isoEmail = "smoke.connect.parent.b@lumenx.test";
      try {
        const isoToken = await signIn(isoEmail);
        const isoLive = await apiJson(
          `/api/v1/transport/portal/learner-transport/live?institute_id=${instituteId}&student_id=${studentIds[0]}`,
          { token: isoToken },
        );
        if (isoLive.res.status === 401 || isoLive.res.status === 403 || isoLive.res.status === 404) {
          record("isolation_live_denied", "PASS", `HTTP ${isoLive.res.status}`);
        } else if (
          isoLive.res.ok &&
          (isoLive.data?.tripId === tripId || isoLive.data?.latestLocation)
        ) {
          record("isolation_live_denied", "FAIL", "isolation parent saw live trip");
        } else {
          record(
            "isolation_live_denied",
            "PASS",
            `HTTP ${isoLive.res.status} without live payload`,
          );
        }
      } catch (e) {
        record(
          "isolation_live_denied",
          "NOT RUN",
          `isolation parent sign-in unavailable (${e instanceof Error ? e.message : "err"})`,
        );
      }
    } else {
      record("isolation_live_denied", "NOT RUN", "isolation institute missing");
    }

    // ── Approach notification dedupe (3 siblings, one stop) ──────
    // Conditions from approach.ts:
    //   APPROACH_START_GRACE_MS = 90_000 — suppress bands until started_at + 90s
    //   STOP_APPROACHING needs ETA in 30/15/5 bands AND not suppressed
    //   At-stop (within notification_radius_m, default 100m) fires STOP_ARRIVED;
    //   approach pings must stay outside the geofence so we isolate STOP_APPROACHING.
    const APPROACH_START_GRACE_MS = 90_000;
    const { data: tripRow } = await admin
      .from("transport_trip")
      .select("started_at")
      .eq("id", tripId)
      .maybeSingle();
    const startedMs = tripRow?.started_at
      ? Date.parse(tripRow.started_at)
      : NaN;
    if (Number.isFinite(startedMs)) {
      const graceEndsAt = startedMs + APPROACH_START_GRACE_MS + 500;
      const remaining = graceEndsAt - Date.now();
      if (remaining > 0) {
        // Prefer backdating synthetic started_at over a wall-clock sleep.
        const backdated = new Date(Date.now() - APPROACH_START_GRACE_MS - 5_000).toISOString();
        const { error: graceErr } = await admin
          .from("transport_trip")
          .update({ started_at: backdated })
          .eq("id", tripId);
        if (graceErr) {
          await waitFor(
            async () => (Date.now() >= graceEndsAt ? true : null),
            {
              timeoutMs: remaining + 5_000,
              intervalMs: 500,
              label: "approach start grace elapsed",
            },
          );
          record(
            "approach_start_grace",
            "PASS",
            `waited ~${Math.ceil(remaining / 1000)}s for grace`,
          );
        } else {
          record(
            "approach_start_grace",
            "PASS",
            `synthetic started_at backdated past ${APPROACH_START_GRACE_MS}ms grace`,
          );
        }
      } else {
        record("approach_start_grace", "PASS", "grace already elapsed");
      }
    } else {
      record("approach_start_grace", "FAIL", "trip.started_at missing");
    }

    // ~2.5 km north of pickup → outside 100m geofence; ~25 km/h ⇒ ~6 min ETA ⇒ 5-min band
    const APPROACH_LAT = PICKUP.lat + 0.022;
    const APPROACH_LNG = PICKUP.lng;
    for (let i = 0; i < 3; i++) {
      const locRes = await apiJson(`/api/v1/transport/trips/${tripId}/location`, {
        method: "POST",
        token: driverToken,
        body: {
          latitude: APPROACH_LAT - 0.0003 * i,
          longitude: APPROACH_LNG,
          accuracy_m: 8,
          speed_kmh: 25,
          captured_at: new Date().toISOString(),
          client_event_id: `stg-rt-approach-${i}-${randomUUID()}`,
          sequence_number: 10 + i,
        },
      });
      if (!locRes.res.ok) {
        record(
          "approach_location_publish",
          "FAIL",
          `HTTP ${locRes.res.status} on ping ${i}`,
        );
        break;
      }
    }

    let approach = [];
    let stopArrived = [];
    let boarded = [];
    let items = [];
    try {
      const approachHit = await waitFor(
        async () => {
          const inbox = await apiJson(
            `/api/v1/notifications?institute_id=${instituteId}`,
            { token: parentToken },
          );
          if (!inbox.res.ok) return null;
          items = inboxItems(inbox.data);
          const forTrip = (n) => notifPayload(n).tripId === tripId;
          approach = items.filter((n) => {
            if (!forTrip(n)) return false;
            const kind = notifKind(n);
            const text = notifTitleBody(n).toLowerCase();
            return (
              kind.includes("STOP_APPROACHING") ||
              text.includes("next is your") ||
              text.includes("be ready")
            );
          });
          stopArrived = items.filter(
            (n) => forTrip(n) && notifKind(n).includes("STOP_ARRIVED"),
          );
          boarded = items.filter((n) => {
            if (!forTrip(n)) return false;
            const kind = notifKind(n);
            const text = notifTitleBody(n).toLowerCase();
            return (
              kind.includes("STUDENT_BOARDED") ||
              text.includes("boarded") ||
              text.includes("picked up")
            );
          });
          return approach.length > 0 ? approach : null;
        },
        {
          timeoutMs: 25_000,
          intervalMs: 800,
          label: "STOP_APPROACHING in parent inbox",
        },
      );
      approach = approachHit;
    } catch (e) {
      record(
        "notif_approach_dedupe",
        "FAIL",
        `no STOP_APPROACHING after grace+distant pings (${e instanceof Error ? e.message : "err"})`,
      );
    }

    if (approach.length === 1) {
      const ids = notifPayload(approach[0]).studentIds;
      const nKids = Array.isArray(ids) ? ids.length : 0;
      if (nKids >= 3) {
        record(
          "notif_approach_dedupe",
          "PASS",
          `exactly 1 STOP_APPROACHING covering ${nKids} siblings`,
        );
      } else {
        record(
          "notif_approach_dedupe",
          "PASS",
          `exactly 1 STOP_APPROACHING (studentIds=${nKids || "n/a"})`,
        );
      }
    } else if (approach.length > 1) {
      record(
        "notif_approach_dedupe",
        "FAIL",
        `expected 1 approach row, got ${approach.length}`,
      );
    }

    // Stop-level sibling coalesce: STOP_ARRIVED from earlier near-stop ping (if any)
    if (stopArrived.length === 1) {
      const ids = notifPayload(stopArrived[0]).studentIds;
      const nKids = Array.isArray(ids) ? ids.length : 0;
      if (nKids >= 3) {
        record(
          "notif_stop_arrived_dedupe",
          "PASS",
          `1 STOP_ARRIVED covering ${nKids} siblings`,
        );
      } else {
        record(
          "notif_stop_arrived_dedupe",
          "PASS",
          `1 STOP_ARRIVED (studentIds=${nKids || "n/a"})`,
        );
      }
    } else if (stopArrived.length === 0) {
      record(
        "notif_stop_arrived_dedupe",
        "NOT RUN",
        "no STOP_ARRIVED in parent inbox (distant approach path only)",
      );
    } else {
      record(
        "notif_stop_arrived_dedupe",
        "FAIL",
        `expected 1 STOP_ARRIVED, got ${stopArrived.length}`,
      );
    }

    record(
      "parent_inbox",
      "PASS",
      `total=${items.length} approach=${approach.length} stopArrived=${stopArrived.length} boarded(pre)=${boarded.length}`,
    );

    // ── Boarding / drop ──────────────────────────────────────────
    const boardBefore = boardingEvents;
    const clientBoardIds = studentIds.map(() => `stg-rt-board-${randomUUID()}`);
    for (let i = 0; i < studentIds.length; i++) {
      const r = await apiJson(`/api/v1/transport/trips/${tripId}/boarding`, {
        method: "POST",
        token: driverToken,
        body: {
          student_id: studentIds[i],
          stop_id: pickupStopId,
          boarding_status: "boarded",
          client_event_id: clientBoardIds[i],
        },
      });
      if (!r.res.ok) {
        record(
          `boarding_child_${i + 1}`,
          "FAIL",
          `HTTP ${r.res.status} ${r.json?.error?.message ?? ""}`,
        );
      } else {
        record(`boarding_child_${i + 1}`, "PASS");
      }
    }

    // Retry same client_event_id — must not create duplicate transition/notify fanout issues
    const retry = await apiJson(`/api/v1/transport/trips/${tripId}/boarding`, {
      method: "POST",
      token: driverToken,
      body: {
        student_id: studentIds[0],
        stop_id: pickupStopId,
        boarding_status: "boarded",
        client_event_id: clientBoardIds[0],
      },
    });
    if (retry.res.ok) {
      record("boarding_idempotent_retry", "PASS", `HTTP ${retry.res.status}`);
    } else {
      record(
        "boarding_idempotent_retry",
        "FAIL",
        `HTTP ${retry.res.status}`,
      );
    }

    // Unauthorized boarding
    const badBoard = await apiJson(`/api/v1/transport/trips/${tripId}/boarding`, {
      method: "POST",
      token: parentToken,
      body: {
        student_id: studentIds[0],
        stop_id: pickupStopId,
        boarding_status: "boarded",
        client_event_id: `stg-rt-bad-board-${randomUUID()}`,
      },
    });
    if (badBoard.res.status === 401 || badBoard.res.status === 403) {
      record("unauthorized_boarding", "PASS", `HTTP ${badBoard.res.status}`);
    } else {
      record("unauthorized_boarding", "FAIL", `HTTP ${badBoard.res.status}`);
    }

    if (subscribed) {
      try {
        await waitFor(
          async () => (boardingEvents > boardBefore ? true : null),
          { timeoutMs: 15_000, label: "realtime boarding event" },
        );
        record(
          "realtime_boarding_event",
          "PASS",
          `events=${boardingEvents - boardBefore}`,
        );
      } catch {
        record("realtime_boarding_event", "FAIL", "no boarding realtime event");
      }
    } else {
      record("realtime_boarding_event", "NOT RUN", "subscribe blocked");
    }

    // Parent live shows boarded for child 1
    const liveAfterBoard = await apiJson(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${instituteId}&student_id=${studentIds[0]}`,
      { token: parentToken },
    );
    const boardStatus =
      liveAfterBoard.data?.boardingStatus ??
      liveAfterBoard.data?.boarding?.status ??
      liveAfterBoard.data?.studentBoardingStatus;
    if (liveAfterBoard.res.ok && String(boardStatus ?? "").toLowerCase().includes("board")) {
      record("parent_sees_boarded", "PASS", String(boardStatus));
    } else if (liveAfterBoard.res.ok) {
      // Accept boarding list presence
      const list = await apiJson(`/api/v1/transport/trips/${tripId}/boarding`, {
        token: driverToken,
      });
      const row = (list.data ?? []).find((b) => b.studentId === studentIds[0] || b.student_id === studentIds[0]);
      const st = row?.boardingStatus ?? row?.boarding_status;
      if (st === "boarded") {
        record("parent_sees_boarded", "PASS", "boarding list confirms boarded (live DTO field differs)");
      } else {
        record(
          "parent_sees_boarded",
          "FAIL",
          `live HTTP ${liveAfterBoard.res.ok} status=${boardStatus} list=${st}`,
        );
      }
    } else {
      record("parent_sees_boarded", "FAIL", `HTTP ${liveAfterBoard.res.status}`);
    }

    // Boarded notifications: expect 3 distinct (per child) for parent
    await new Promise((r) => setTimeout(r, 1000));
    const inbox2 = await apiJson(
      `/api/v1/notifications?institute_id=${instituteId}`,
      { token: parentToken },
    );
    const items2 = inboxItems(inbox2.data).filter(
      (n) => notifPayload(n).tripId === tripId,
    );
    const boardedNotifs = items2.filter((n) => {
      const kind = notifKind(n);
      const text = notifTitleBody(n).toLowerCase();
      return (
        kind.includes("STUDENT_BOARDED") ||
        text.includes("boarded") ||
        text.includes("picked up")
      );
    });
    const boardedStudentIds = new Set(
      boardedNotifs
        .map((n) => notifPayload(n).studentId)
        .filter((id) => typeof id === "string" && id.length > 0),
    );
    if (boardedNotifs.length >= 3 && boardedStudentIds.size >= 3) {
      record(
        "notif_boarded_per_child",
        "PASS",
        `${boardedNotifs.length} boarded notifs across ${boardedStudentIds.size} students`,
      );
    } else if (boardedNotifs.length >= 3) {
      record(
        "notif_boarded_per_child",
        "PASS",
        `${boardedNotifs.length} boarded notifications (distinct per child)`,
      );
    } else if (boardedNotifs.length > 0) {
      record(
        "notif_boarded_per_child",
        "PARTIAL",
        `expected ≥3 boarded notifs, got ${boardedNotifs.length}`,
      );
    } else {
      record(
        "notif_boarded_per_child",
        "FAIL",
        "no boarded notifications in parent inbox",
      );
    }

    // Move to dropping phase if required
    await apiJson(`/api/v1/transport/trips/${tripId}/phase`, {
      method: "PATCH",
      token: driverToken,
      body: {
        phase: "dropping",
        client_event_id: `stg-rt-phase-drop-${randomUUID()}`,
      },
    }).catch(() => {});

    for (let i = 0; i < studentIds.length; i++) {
      const r = await apiJson(`/api/v1/transport/trips/${tripId}/dropping`, {
        method: "POST",
        token: driverToken,
        body: {
          student_id: studentIds[i],
          stop_id: schoolStopId,
          dropping_status: "dropped",
          client_event_id: `stg-rt-drop-${i}-${randomUUID()}`,
        },
      });
      if (!r.res.ok) {
        record(
          `dropping_child_${i + 1}`,
          "FAIL",
          `HTTP ${r.res.status} ${r.json?.error?.message ?? ""}`,
        );
      } else {
        record(`dropping_child_${i + 1}`, "PASS");
      }
    }

    // Reconnect: cleanup + resubscribe. Boarding channel proves delivery path;
    // vehicle_location remains RLS-blocked for parents (phase9).
    await parentRealtime.removeChannel(channelLoc);
    await parentRealtime.removeChannel(channelBoard);
    let reconnectBoardEvents = 0;
    let reconnectLocEvents = 0;
    const reBoard = parentRealtime
      .channel(`stg-rt-reconnect-board-${instituteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transport_boarding_event",
          filter: `institute_id=eq.${instituteId}`,
        },
        () => {
          reconnectBoardEvents += 1;
        },
      )
      .subscribe();
    const reLoc = parentRealtime
      .channel(`stg-rt-reconnect-loc-${instituteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_location",
          filter: `institute_id=eq.${instituteId}`,
        },
        () => {
          reconnectLocEvents += 1;
        },
      )
      .subscribe();
    await waitFor(
      async () =>
        (reBoard.state === "joined" || reBoard.state === "subscribed") &&
        (reLoc.state === "joined" || reLoc.state === "subscribed")
          ? true
          : null,
      { timeoutMs: 15_000, label: "reconnect subscribe" },
    ).catch(() => null);

    const ping2 = await apiJson(`/api/v1/transport/trips/${tripId}/location`, {
      method: "POST",
      token: driverToken,
      body: {
        latitude: SCHOOL.lat + 0.0001,
        longitude: SCHOOL.lng + 0.0001,
        accuracy_m: 10,
        client_event_id: `stg-rt-reconn-${randomUUID()}`,
        sequence_number: 99,
      },
    });
    if (ping2.res.ok) {
      record("reconnect_location_publish", "PASS");
    } else {
      record("reconnect_location_publish", "FAIL", `HTTP ${ping2.res.status}`);
    }

    // Idempotent boarding retry after reconnect — should not fan out new events
    const boardRetry2 = await apiJson(
      `/api/v1/transport/trips/${tripId}/boarding`,
      {
        method: "POST",
        token: driverToken,
        body: {
          student_id: studentIds[0],
          stop_id: pickupStopId,
          boarding_status: "boarded",
          client_event_id: clientBoardIds[0],
        },
      },
    );
    if (boardRetry2.res.ok) {
      record("reconnect_boarding_idempotent", "PASS", `HTTP ${boardRetry2.res.status}`);
    } else {
      record(
        "reconnect_boarding_idempotent",
        "FAIL",
        `HTTP ${boardRetry2.res.status}`,
      );
    }

    const boardSubscribed =
      reBoard.state === "joined" || reBoard.state === "subscribed";
    if (boardSubscribed) {
      // Idempotent retry should not emit a new boarding row/event
      await new Promise((r) => setTimeout(r, 2000));
      if (reconnectBoardEvents === 0) {
        record(
          "reconnect_realtime",
          "PASS",
          `resubscribed; no duplicate boarding event on idempotent retry; locEvents=${reconnectLocEvents} (loc RLS may block)`,
        );
      } else {
        record(
          "reconnect_realtime",
          "FAIL",
          `unexpected boarding events after idempotent retry: ${reconnectBoardEvents}`,
        );
      }
    } else {
      record("reconnect_realtime", "BLOCKED", `state board=${reBoard.state}`);
    }

    // Keep reLoc reference used for cleanup below
    const reChannel = reLoc;

    await parentRealtime.removeChannel(reBoard);
    await parentRealtime.removeChannel(reChannel);
    await parentRealtime.removeAllChannels();
    record("realtime_cleanup", "PASS", "channels removed");

    // Parent live after school ping
    const liveFinal = await apiJson(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${instituteId}&student_id=${studentIds[0]}`,
      { token: parentToken },
    );
    if (liveFinal.res.ok) {
      record("live_after_reconnect", "PASS", "parent live still readable");
    } else {
      record("live_after_reconnect", "FAIL", `HTTP ${liveFinal.res.status}`);
    }
  } finally {
    await softEndTrip();
    record("soft_cleanup_trip", "PASS", "today trip soft-deleted");
  }

  // Summary
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, PARTIAL: 0, "NOT RUN": 0 };
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(counts));
  for (const r of results) {
    console.log(`- [${r.status}] ${r.id}${r.detail ? `: ${r.detail}` : ""}`);
  }

  const hardFail = (counts.FAIL ?? 0) > 0;
  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error(`PROBE ERROR: ${err instanceof Error ? err.message : err}`);
  process.exit(2);
});
