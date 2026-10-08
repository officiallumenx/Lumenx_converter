import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_TEACHER = "22222222-2222-4222-8222-222222222222";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const USER_DRIVER = "66666666-6666-4666-8666-666666666666";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_DRIVER = "aa666666-6666-4666-8666-666666666666";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const VEHICLE_A = "ee111111-1111-4111-8111-111111111111";
const VEHICLE_B = "ee222222-2222-4222-8222-222222222222";
const ENROLL_A = "ae111111-1111-4111-8111-111111111111";
const ENROLL_OTHER = "ae222222-2222-4222-8222-222222222222";
const ROUTE_A = "af111111-1111-4111-8111-111111111111";
const DRIVER_A = "d1111111-1111-4111-8111-111111111111";
const STOP_PICKUP = "b0111111-1111-4111-8111-111111111111";
const STOP_DROP = "b0222222-2222-4222-8222-222222222222";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
    { id: USER_DRIVER, display_name: "Driver", email: "d@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_DRIVER, user_id: USER_DRIVER, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_DRIVER, role_code: "driver" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Kid A",
      first_name: "Kid",
      surname: "A",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      display_name: "Kid B",
      first_name: "Kid",
      surname: "B",
      deleted_at: null,
    },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.driver = [
    {
      id: DRIVER_A,
      institute_id: INST_A,
      user_profile_id: USER_DRIVER,
      display_name: "Driver A",
      phone: "9999999999",
      license_number: "DL-1",
      license_expiry: null,
      status: "active",
      notes: null,
      assigned_vehicle_id: VEHICLE_A,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.vehicle = [
    {
      id: VEHICLE_A,
      institute_id: INST_A,
      vehicle_number: "BUS-1",
      registration_number: "KA01AB1234",
      capacity: 40,
      status: "active",
      notes: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: VEHICLE_B,
      institute_id: INST_B,
      vehicle_number: "BUS-X",
      registration_number: "KA02XY9999",
      capacity: 30,
      status: "active",
      notes: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.route = [
    {
      id: ROUTE_A,
      institute_id: INST_A,
      name: "North Loop",
      vehicle_id: VEHICLE_A,
      driver_id: DRIVER_A,
      status: "active",
      config_status: "configured",
      locked_at: null,
      locked_by_user_id: null,
      setup_finished_at: null,
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.stop = [
    {
      id: STOP_PICKUP,
      institute_id: INST_A,
      route_id: ROUTE_A,
      name: "Gate A",
      location_label: "Main Gate",
      latitude: 12.97,
      longitude: 77.59,
      route_order: 0,
      notification_radius_m: 150,
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: STOP_DROP,
      institute_id: INST_A,
      route_id: ROUTE_A,
      name: "School",
      location_label: "Campus",
      latitude: 12.98,
      longitude: 77.6,
      route_order: 1,
      notification_radius_m: 150,
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.transport_enrollment = [
    {
      id: ENROLL_A,
      institute_id: INST_A,
      student_id: STUDENT_A,
      route_id: ROUTE_A,
      pickup_stop_id: STOP_PICKUP,
      drop_stop_id: STOP_DROP,
      status: "active",
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ENROLL_OTHER,
      institute_id: INST_A,
      student_id: STUDENT_B,
      route_id: ROUTE_A,
      pickup_stop_id: STOP_PICKUP,
      drop_stop_id: STOP_DROP,
      status: "active",
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(db: MockDb) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(
    env,
    silentLogger,
    createMockSupabaseClients({
      tokens: {
        "token-admin": USER_ADMIN,
        "token-teacher": USER_TEACHER,
        "token-parent": USER_PARENT,
        "token-other": USER_OTHER,
        "token-driver": USER_DRIVER,
      },
      db,
    }),
  );
}

describe("transport api", () => {
  it("lists vehicles for staff and blocks cross-tenant", async () => {
    const app = appWithDb(baseDb());

    const ok = await app.request(`/api/v1/transport/vehicles?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(ok.status).toBe(200);
    expect((await json(ok)).data).toHaveLength(1);

    const cross = await app.request(`/api/v1/transport/vehicles?institute_id=${INST_B}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cross.status).toBe(403);
  });

  it("creates vehicle, driver, route, stop, and enrollment", async () => {
    const db = baseDb();
    db.transport_enrollment = [];
    const app = appWithDb(db);

    const vehicle = await app.request("/api/v1/transport/vehicles", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        vehicle_number: "BUS-2",
        registration_number: "KA01CD5678",
        capacity: 35,
      }),
    });
    expect(vehicle.status).toBe(201);
    const vehicleId = (await json(vehicle)).data.id;

    const driver = await app.request("/api/v1/transport/drivers", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        display_name: "Ravi Driver",
        phone: "9999999999",
        license_number: "DL-123",
        app_account_pin: "1234",
        assigned_vehicle_id: vehicleId,
      }),
    });
    expect(driver.status).toBe(201);
    const driverBody = await json(driver);
    expect(driverBody.data.hasAppPin).toBe(true);
    expect(driverBody.data.assignedVehicleId).toBe(vehicleId);
    const driverId = driverBody.data.id;

    // Authenticated transport session is USER_DRIVER — bind the new driver profile
    // so stop creation is authorized against the assigned route (Phase 9).
    for (const row of db.driver) {
      if (row.id === driverId) {
        row.user_profile_id = USER_DRIVER;
      } else if (row.user_profile_id === USER_DRIVER) {
        row.user_profile_id = null;
        row.assigned_vehicle_id = null;
      }
    }

    const adminRouteBlocked = await app.request("/api/v1/transport/routes", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "East Loop",
        vehicle_id: vehicleId,
        driver_id: driverId,
      }),
    });
    expect(adminRouteBlocked.status).toBe(403);

    // Assignment auto-links an approved route for the vehicle.
    const routesList = await app.request(
      `/api/v1/transport/routes?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(routesList.status).toBe(200);
    const linked = ((await json(routesList)).data as Array<{
      id: string;
      vehicleId: string;
      driverId: string;
    }>).find((r) => r.vehicleId === vehicleId && r.driverId === driverId);
    expect(linked).toBeTruthy();
    const routeId = linked!.id;

    const adminStopBlocked = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: routeId,
        name: "Stop 1",
        location_label: "Corner",
        latitude: 12.9,
        longitude: 77.5,
        route_order: 0,
      }),
    });
    expect(adminStopBlocked.status).toBe(403);

    const stop = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: routeId,
        name: "Stop 1",
        location_label: "Corner",
        latitude: 12.9,
        longitude: 77.5,
        route_order: 0,
      }),
    });
    expect(stop.status).toBe(201);
    const stopId = (await json(stop)).data.id;

    const stop2 = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: routeId,
        name: "Stop 2",
        location_label: "School",
        latitude: 12.91,
        longitude: 77.51,
        route_order: 1,
      }),
    });
    expect(stop2.status).toBe(201);
    const stop2Id = (await json(stop2)).data.id;

    const enrollment = await app.request("/api/v1/transport/enrollments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        route_id: routeId,
        pickup_stop_id: stopId,
        drop_stop_id: stop2Id,
      }),
    });
    expect(enrollment.status).toBe(201);
    const enrollBody = await json(enrollment);
    expect(enrollBody.data.studentId).toBe(STUDENT_A);
    expect(enrollBody.data.routeId).toBe(routeId);
  });

  it("parent can list own child enrollment only; 403 on other", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/transport/enrollments?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(list.status).toBe(200);
    const listed = await json(list);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].id).toBe(ENROLL_A);

    const own = await app.request(`/api/v1/transport/enrollments/${ENROLL_A}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(own.status).toBe(200);

    const other = await app.request(`/api/v1/transport/enrollments/${ENROLL_OTHER}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(other.status).toBe(403);
  });

  it("teacher cannot write vehicles", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/transport/vehicles", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        vehicle_number: "BUS-T",
        registration_number: "KA99ZZ0001",
        capacity: 20,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("gets and upserts transport settings", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const empty = await app.request(
      `/api/v1/transport/settings?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(empty.status).toBe(200);
    expect((await json(empty)).data.defaultNotificationRadiusM).toBe(150);

    const put = await app.request(
      `/api/v1/transport/settings?institute_id=${INST_A}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          default_notification_radius_m: 200,
          default_pickup_buffer_mins: 10,
          working_days: [1, 2, 3, 4, 5, 6],
        }),
      },
    );
    expect(put.status).toBe(200);
    const putBody = await json(put);
    expect(putBody.data.defaultNotificationRadiusM).toBe(200);
    expect(putBody.data.defaultPickupBufferMins).toBe(10);
    expect(putBody.data.workingDays).toEqual([1, 2, 3, 4, 5, 6]);

    const get = await app.request(
      `/api/v1/transport/settings?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(get.status).toBe(200);
    expect((await json(get)).data.defaultNotificationRadiusM).toBe(200);
  });

  it("ignores client user_profile_id on driver create", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/transport/drivers", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        display_name: "New Driver",
        phone: "8888888888",
        license_number: "DL-999",
        app_account_pin: "5678",
        user_profile_id: USER_TEACHER,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.userProfileId).toBeNull();
    expect(body.data.hasAppPin).toBe(true);
  });

  it("parent can read learner transport portal summary", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/transport/portal/learner-transport?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.studentId).toBe(STUDENT_A);
    expect(body.data.enrollmentId).toBe(ENROLL_A);
    expect(body.data.busNumber).toBe("BUS-1");
    expect(body.data.vehicleId).toBe(VEHICLE_A);
    expect(body.data.pickupStop?.name).toBe("Gate A");
  });

  it("phase6: parent live/history denied for other student, other parent, other institute", async () => {
    const app = appWithDb(baseDb());

    const otherStudentLive = await app.request(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_A}&student_id=${STUDENT_B}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(otherStudentLive.status).toBe(403);

    const otherStudentHistory = await app.request(
      `/api/v1/transport/portal/learner-transport/history?institute_id=${INST_A}&student_id=${STUDENT_B}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(otherStudentHistory.status).toBe(403);

    const otherStudentSummary = await app.request(
      `/api/v1/transport/portal/learner-transport?institute_id=${INST_A}&student_id=${STUDENT_B}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(otherStudentSummary.status).toBe(403);

    const otherParentLive = await app.request(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-other" } },
    );
    expect(otherParentLive.status).toBe(403);

    const otherInstituteLive = await app.request(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_B}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(otherInstituteLive.status).toBe(403);

    const ownLive = await app.request(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(ownLive.status).toBe(200);

    const ownHistory = await app.request(
      `/api/v1/transport/portal/learner-transport/history?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(ownHistory.status).toBe(200);
    expect(Array.isArray((await json(ownHistory)).data)).toBe(true);
  });

  it("driver submits pending route and admin approves via review queue", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/transport/routes", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Driver Route",
      }),
    });
    expect(create.status).toBe(201);
    const created = (await json(create)).data;
    expect(created.approvalStatus).toBe("pending");

    const queueBefore = await app.request(
      `/api/v1/transport/review-queue?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(queueBefore.status).toBe(200);
    const pending = (await json(queueBefore)).data as Array<{ kind: string; item: { id: string } }>;
    expect(pending.some((x) => x.kind === "route" && x.item.id === created.id)).toBe(true);

    const parentList = await app.request(
      `/api/v1/transport/routes?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentList.status).toBe(403);

    const approve = await app.request(
      `/api/v1/transport/routes/${created.id}/approve`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(approve.status).toBe(200);
    expect((await json(approve)).data.approvalStatus).toBe("approved");
  });

  it("driver starts trip, marks boarding, and parent reads live transport", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const trip = (await json(start)).data;
    expect(trip.phase).toBe("starting");

    const phase = await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "running", current_stop_index: 0 }),
    });
    expect(phase.status).toBe(200);

    const boarding = await app.request(`/api/v1/transport/trips/${trip.id}/boarding`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_A,
        stop_id: STOP_PICKUP,
        boarding_status: "boarded",
        client_event_id: "board-evt-legacy-1",
      }),
    });
    expect(boarding.status).toBe(200);
    expect((await json(boarding)).data.boardingStatus).toBe("boarded");

    // Phase 8: duplicate client_event_id is idempotent (no second mark invent).
    const boardingDup = await app.request(`/api/v1/transport/trips/${trip.id}/boarding`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_A,
        stop_id: STOP_PICKUP,
        boarding_status: "boarded",
        client_event_id: "board-evt-legacy-1",
      }),
    });
    expect(boardingDup.status).toBe(200);
    expect((await json(boardingDup)).data.boardingStatus).toBe("boarded");

    const live = await app.request(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(live.status).toBe(200);
    const liveBody = await json(live);
    expect(liveBody.data.activeTrip?.id).toBe(trip.id);
    expect(liveBody.data.boarding?.boardingStatus).toBe("boarded");

    const adminTrips = await app.request(
      `/api/v1/transport/trips?institute_id=${INST_A}&trip_date=${today}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(adminTrips.status).toBe(200);
    expect((await json(adminTrips)).data).toHaveLength(1);
  });

  it("driver triggers emergency and admin resolves it", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);

    const create = await app.request("/api/v1/transport/emergencies", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        driver_id: DRIVER_A,
        vehicle_id: VEHICLE_A,
        note: "Flat tire",
        latitude: 12.97,
        longitude: 77.59,
      }),
    });
    expect(create.status).toBe(201);
    const emergency = (await json(create)).data;
    expect(emergency.status).toBe("active");

    const driverList = await app.request(
      `/api/v1/transport/emergencies?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(driverList.status).toBe(200);
    const driverIds = (await json(driverList)).data.map((e: { id: string }) => e.id);
    expect(driverIds).toContain(emergency.id);

    const ack = await app.request(
      `/api/v1/transport/emergencies/${emergency.id}/acknowledge`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(ack.status).toBe(200);
    expect((await json(ack)).data.status).toBe("acknowledged");

    const resolve = await app.request(
      `/api/v1/transport/emergencies/${emergency.id}/resolve`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resolve_note: "Help dispatched" }),
      },
    );
    expect(resolve.status).toBe(200);
    expect((await json(resolve)).data.status).toBe("resolved");
  });

  it("returns transport analytics summary for admin", async () => {
    const app = appWithDb(baseDb());
    const today = new Date().toISOString().slice(0, 10);

    const res = await app.request(
      `/api/v1/transport/analytics?institute_id=${INST_A}&trip_date=${today}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.totalRoutes).toBe(1);
    expect(body.data.approvedEnrollments).toBe(2);
    expect(body.data.approvedStops).toBe(2);
    expect(body.data.configuredRoutes).toBe(1);
    expect(body.data.tripDate).toBe(today);
    expect(body.data.activeBuses).toBe(0);
    expect(body.data.activeDrivers).toBe(0);
    expect(body.data.studentsUsingTransport).toBe(2);
    expect(body.data.delayedTrips).toBe(0);
    expect(body.data.busesWithStaleGps).toBe(0);
    expect(body.data.openEmergencies).toBe(0);
  });

  it("phase7: analytics/trips/participants stay institute-isolated; corrections preserve enrollment", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const crossAnalytics = await app.request(
      `/api/v1/transport/analytics?institute_id=${INST_B}&trip_date=${today}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(crossAnalytics.status).toBe(403);

    const parentAnalytics = await app.request(
      `/api/v1/transport/analytics?institute_id=${INST_A}&trip_date=${today}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentAnalytics.status).toBe(403);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const trip = (await json(start)).data;

    const analytics = await app.request(
      `/api/v1/transport/analytics?institute_id=${INST_A}&trip_date=${today}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(analytics.status).toBe(200);
    const a = (await json(analytics)).data;
    expect(a.activeTrips).toBeGreaterThanOrEqual(1);
    expect(a.activeBuses).toBeGreaterThanOrEqual(1);
    expect(a.activeDrivers).toBeGreaterThanOrEqual(1);
    expect(a.busesWithStaleGps).toBeGreaterThanOrEqual(1);

    const tripGet = await app.request(`/api/v1/transport/trips/${trip.id}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(tripGet.status).toBe(200);
    const tripBody = (await json(tripGet)).data;
    expect(Array.isArray(tripBody.timeline)).toBe(true);

    const otherInstTrip = await app.request(`/api/v1/transport/trips/${trip.id}`, {
      headers: { Authorization: "Bearer token-other" },
    });
    expect(otherInstTrip.status).toBe(403);

    const participants = await app.request(
      `/api/v1/transport/trips/${trip.id}/effective-participants`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(participants.status).toBe(200);
    const roster = (await json(participants)).data;
    expect(roster.expectedCount).toBeGreaterThanOrEqual(1);

    const removeToday = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        exception_type: "NOT_RIDING",
        service_date: today,
        notes: "Admin removed from today's trip",
      }),
    });
    expect(removeToday.status).toBe(201);

    const enrollments = await app.request(
      `/api/v1/transport/enrollments?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(enrollments.status).toBe(200);
    const enrollList = (await json(enrollments)).data as Array<{
      studentId: string;
      status: string;
    }>;
    expect(
      enrollList.some((e) => e.studentId === STUDENT_A && e.status === "active"),
    ).toBe(true);

    const afterRemove = await app.request(
      `/api/v1/transport/trips/${trip.id}/effective-participants`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    const afterRoster = (await json(afterRemove)).data;
    expect(afterRoster.notRidingCount).toBeGreaterThanOrEqual(1);
  });

  it("driver route roster returns stops and named students for assigned route", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);

    const res = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.driverId).toBe(DRIVER_A);
    expect(body.data.routeId).toBe(ROUTE_A);
    expect(body.data.stops.length).toBeGreaterThanOrEqual(2);
    expect(body.data.students.length).toBe(2);
    expect(body.data.students.some((s: { studentName: string }) => s.studentName === "Kid A")).toBe(
      true,
    );

    const forbidden = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(forbidden.status).toBe(403);
  });

  it("GPS ping near stop notifies parent and live returns approach (Phase 2 Step 10)", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const trip = (await json(start)).data;

    await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "running", current_stop_index: 0 }),
    });

    // Expire approach start-grace so bands/arrival can fire on this ping.
    const tripRow = db.transport_trip.find((t) => t.id === trip.id);
    if (tripRow) {
      tripRow.started_at = new Date(Date.now() - 120_000).toISOString();
    }

    const ping = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: 12.9701,
        longitude: 77.59,
        accuracy_m: 10,
      }),
    });
    expect(ping.status).toBe(201);

    // Nearest band only (no 30+15+5 fan-out on one ping).
    expect(
      db.notification.some(
        (n) =>
          typeof n.dedupe_key === "string" &&
          String(n.dedupe_key).includes(`:approach:5`),
      ),
    ).toBe(true);
    expect(
      db.notification.some(
        (n) =>
          typeof n.dedupe_key === "string" &&
          String(n.dedupe_key).includes(`:approach:15`),
      ),
    ).toBe(false);
    expect(
      db.notification.some(
        (n) =>
          typeof n.dedupe_key === "string" &&
          String(n.dedupe_key).includes(`:approach:30`),
      ),
    ).toBe(false);
    // Arrival once per trip×stop — INFO, not critical.
    const arrivalKeys = db.notification
      .map((n) => String(n.dedupe_key ?? ""))
      .filter((k) => k === `transport:${trip.id}:stop:${STOP_PICKUP}:arrived`);
    expect(arrivalKeys).toHaveLength(1);
    const arrival = db.notification.find(
      (n) => n.dedupe_key === `transport:${trip.id}:stop:${STOP_PICKUP}:arrived`,
    );
    expect(arrival?.priority).not.toBe("critical");
    expect((arrival?.payload as { severity?: string })?.severity).toBe("info");
    expect(
      db.notification_recipient.some((r) => r.user_profile_id === USER_PARENT),
    ).toBe(true);

    const live = await app.request(
      `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(live.status).toBe(200);
    const liveBody = await json(live);
    expect(liveBody.data.approach).toMatchObject({
      stopId: STOP_PICKUP,
      stopName: "Gate A",
      withinRadius: true,
      band: 5,
    });
    expect(liveBody.data.approach.distanceM).toBeLessThan(150);
    expect(liveBody.data.approach.etaMinutes).toBeGreaterThanOrEqual(0);
  });

  it("GPS ping ~20 min out fires approach30 + approach15 only (Phase 2 Step 10)", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const trip = (await json(start)).data;

    await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "running", current_stop_index: 0 }),
    });

    // Expire approach start-grace so bands can fire.
    const tripRow = db.transport_trip.find((t) => t.id === trip.id);
    if (tripRow) {
      tripRow.started_at = new Date(Date.now() - 120_000).toISOString();
    }

    // ~7.5 km north ≈ 15–16 min at default urban speed → nearest band is 15, not 5.
    const ping = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: 13.036,
        longitude: 77.59,
        accuracy_m: 10,
      }),
    });
    expect(ping.status).toBe(201);

    const keys = db.notification
      .map((n) => String(n.dedupe_key ?? ""))
      .filter((k) => k.includes(trip.id));
    // ~16 min at default 28 km/h → nearest band is 30 (not 15/5). One band per ping.
    expect(keys.some((k) => k.includes(":approach:30"))).toBe(true);
    expect(keys.some((k) => k.includes(":approach:15"))).toBe(false);
    expect(keys.some((k) => k.includes(":approach:5"))).toBe(false);
  });

  it("create stop without radius uses transport_settings default", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    db.transport_settings = [
      {
        institute_id: INST_A,
        default_notification_radius_m: 250,
        default_pickup_buffer_mins: 5,
        working_days: [1, 2, 3, 4, 5],
        notifications_enabled: true,
        remember_enabled: true,
        default_pickup_time: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const app = appWithDb(db);

    const stop = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        name: "New Stop",
        location_label: "Corner",
        latitude: 12.9,
        longitude: 77.5,
        route_order: 2,
      }),
    });
    expect(stop.status).toBe(201);
    const body = await json(stop);
    expect(body.data.notificationRadiusM).toBe(250);
  });

  it("admin can PATCH stop radius and GET returns same value", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const patch = await app.request(`/api/v1/transport/stops/${STOP_PICKUP}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notification_radius_m: 75 }),
    });
    expect(patch.status).toBe(200);
    expect((await json(patch)).data.notificationRadiusM).toBe(75);

    const get = await app.request(`/api/v1/transport/stops/${STOP_PICKUP}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(get.status).toBe(200);
    expect((await json(get)).data.notificationRadiusM).toBe(75);
  });

  it("driver can PATCH pickup/drop on Admin enrollment for assigned route", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    db.transport_enrollment = [
      {
        id: ENROLL_A,
        institute_id: INST_A,
        student_id: STUDENT_A,
        route_id: ROUTE_A,
        pickup_stop_id: null,
        drop_stop_id: null,
        status: "active",
        approval_status: "approved",
        submitted_by_user_id: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const forbiddenRoute = await app.request(`/api/v1/transport/enrollments/${ENROLL_A}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ route_id: ROUTE_A }),
    });
    expect(forbiddenRoute.status).toBe(403);

    const patch = await app.request(`/api/v1/transport/enrollments/${ENROLL_A}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pickup_stop_id: STOP_PICKUP,
        drop_stop_id: STOP_DROP,
      }),
    });
    expect(patch.status).toBe(200);
    const body = await json(patch);
    expect(body.data.pickupStopId).toBe(STOP_PICKUP);
    expect(body.data.dropStopId).toBe(STOP_DROP);

    const roster = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(roster.status).toBe(200);
    const rosterBody = await json(roster);
    const student = (rosterBody.data.students as Array<{
      studentId: string;
      pickupStopId: string;
    }>).find((s) => s.studentId === STUDENT_A);
    expect(student?.pickupStopId).toBe(STOP_PICKUP);
  });

  it("Admin school settings syncs school stop onto routes", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    const app = appWithDb(db);

    const put = await app.request(
      `/api/v1/transport/settings?institute_id=${INST_A}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          school_location_label: "Main campus gate",
          school_latitude: 12.9716,
          school_longitude: 77.5946,
        }),
      },
    );
    expect(put.status).toBe(200);
    const putBody = await json(put);
    expect(putBody.data.schoolLatitude).toBe(12.9716);
    expect(putBody.data.schoolLongitude).toBe(77.5946);

    const schoolStops = db.stop.filter(
      (s) => s.route_id === ROUTE_A && s.kind === "school" && !s.deleted_at,
    );
    expect(schoolStops).toHaveLength(1);
    expect(schoolStops[0]?.name).toBe("School");
    expect(schoolStops[0]?.latitude).toBe(12.9716);
  });

  it("driver can set parking stop as start end", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    const app = appWithDb(db);

    const parking = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        name: "Bus park",
        location_label: "Depot",
        latitude: 12.95,
        longitude: 77.55,
        route_order: 0,
        kind: "parking",
      }),
    });
    expect(parking.status).toBe(201);
    const body = await json(parking);
    expect(body.data.kind).toBe("parking");
    expect(body.data.routeOrder).toBe(0);
  });

  it("allows trip start when route approval is still pending", async () => {
    const db = baseDb();
    db.route[0] = {
      ...db.route[0],
      driver_id: DRIVER_A,
      approval_status: "pending",
      submitted_by_user_id: USER_DRIVER,
    };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    expect((await json(start)).data.phase).toBe("starting");
  });

  it("preserves parking notification radius on GPS refresh without radius payload", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    const parkingId = "b0333333-3333-4333-8333-333333333333";
    db.stop.push({
      id: parkingId,
      institute_id: INST_A,
      route_id: ROUTE_A,
      name: "Bus park",
      location_label: "Depot",
      latitude: 12.95,
      longitude: 77.55,
      route_order: 0,
      notification_radius_m: 220,
      kind: "parking",
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    });
    const app = appWithDb(db);

    const refresh = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        name: "Bus park",
        location_label: "Depot refreshed",
        latitude: 12.951,
        longitude: 77.551,
        route_order: 0,
        kind: "parking",
      }),
    });
    expect(refresh.status).toBe(201);
    const body = await json(refresh);
    expect(body.data.id).toBe(parkingId);
    expect(body.data.notificationRadiusM).toBe(220);
    expect(body.data.latitude).toBe(12.951);
    expect(body.data.longitude).toBe(77.551);
    expect(body.data.name).toBe("Bus park");
    expect(body.data.locationLabel).toBe("Depot");
    expect(body.data.approvalStatus).toBe("approved");
    expect(db.stop.find((s) => s.id === parkingId)?.notification_radius_m).toBe(220);
  });

  it("driver create/edit radius round-trips through roster and PATCH omit preserves", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    const app = appWithDb(db);

    const create = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        name: "Radius Fifty",
        location_label: "Corner",
        latitude: 12.91,
        longitude: 77.51,
        route_order: 3,
        notification_radius_m: 50,
      }),
    });
    expect(create.status).toBe(201);
    const created = await json(create);
    expect(created.data.notificationRadiusM).toBe(50);
    const stopId = created.data.id as string;
    expect(db.stop.find((s) => s.id === stopId)?.notification_radius_m).toBe(50);

    const roster50 = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(roster50.status).toBe(200);
    const roster50Body = await json(roster50);
    const stop50 = (
      roster50Body.data.stops as Array<{ id: string; notificationRadiusM: number }>
    ).find((s) => s.id === stopId);
    expect(stop50?.notificationRadiusM).toBe(50);

    const adminGet50 = await app.request(`/api/v1/transport/stops/${stopId}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect((await json(adminGet50)).data.notificationRadiusM).toBe(50);

    const edit = await app.request(`/api/v1/transport/stops/${stopId}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notification_radius_m: 100 }),
    });
    expect(edit.status).toBe(200);
    expect((await json(edit)).data.notificationRadiusM).toBe(100);
    expect(db.stop.find((s) => s.id === stopId)?.notification_radius_m).toBe(100);

    const roster100 = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    const stop100 = (
      (await json(roster100)).data.stops as Array<{
        id: string;
        notificationRadiusM: number;
      }>
    ).find((s) => s.id === stopId);
    expect(stop100?.notificationRadiusM).toBe(100);

    const adminGet100 = await app.request(`/api/v1/transport/stops/${stopId}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect((await json(adminGet100)).data.notificationRadiusM).toBe(100);

    const patchOmit = await app.request(`/api/v1/transport/stops/${stopId}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Radius Hundred" }),
    });
    expect(patchOmit.status).toBe(200);
    expect((await json(patchOmit)).data.notificationRadiusM).toBe(100);
    expect(db.stop.find((s) => s.id === stopId)?.notification_radius_m).toBe(100);

    for (const meters of [50, 100, 150] as const) {
      const set = await app.request(`/api/v1/transport/stops/${stopId}`, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notification_radius_m: meters }),
      });
      expect(set.status).toBe(200);
      expect((await json(set)).data.notificationRadiusM).toBe(meters);
    }

    const invalid = await app.request(`/api/v1/transport/stops/${stopId}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notification_radius_m: 0 }),
    });
    expect(invalid.status).toBe(400);

    const absurd = await app.request(`/api/v1/transport/stops/${stopId}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notification_radius_m: 99999 }),
    });
    expect(absurd.status).toBe(400);

    const cross = await app.request(`/api/v1/transport/stops/${stopId}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-other",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notification_radius_m: 80 }),
    });
    expect([403, 404]).toContain(cross.status);
  });

  it("parent creates Not Riding Today without changing permanent enrollment", async () => {
    const db = baseDb();
    db.institute_settings = [
      {
        institute_id: INST_A,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        settings: {},
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    db.transport_settings = [
      {
        institute_id: INST_A,
        default_notification_radius_m: 150,
        default_pickup_buffer_mins: 5,
        working_days: [1, 2, 3, 4, 5],
        notifications_enabled: true,
        remember_enabled: true,
        default_pickup_time: "23:59",
        school_location_label: null,
        school_latitude: null,
        school_longitude: null,
        school_notification_radius_m: 150,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const app = appWithDb(db);
    const beforeEnrollment = structuredClone(db.transport_enrollment[0]);

    const create = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        exception_type: "NOT_RIDING",
      }),
    });
    expect(create.status).toBe(201);
    const created = (await json(create)).data;
    expect(created.exceptionType).toBe("NOT_RIDING");
    expect(created.reason).toBe("parent");
    expect(created.studentId).toBe(STUDENT_A);
    expect(created.canUndo).toBe(true);

    expect(db.transport_enrollment[0]).toEqual(beforeEnrollment);

    const dup = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        exception_type: "NOT_RIDING",
      }),
    });
    expect(dup.status).toBe(201);
    expect((await json(dup)).data.id).toBe(created.id);

    const list = await app.request(
      `/api/v1/transport/daily-exceptions?institute_id=${INST_A}&date=${created.serviceDate}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(list.status).toBe(200);
    expect((await json(list)).data).toHaveLength(1);

    const participation = await app.request(
      `/api/v1/transport/daily-exceptions/participation?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(participation.status).toBe(200);
    const part = (await json(participation)).data;
    expect(part.ridingToday).toBe(false);
    expect(part.exception?.id).toBe(created.id);
  });

  it("denies unrelated parent and cross-institute daily exception", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const unrelated = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_B,
        exception_type: "NOT_RIDING",
      }),
    });
    expect(unrelated.status).toBe(403);

    const cross = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-other",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        exception_type: "NOT_RIDING",
      }),
    });
    expect([403, 404]).toContain(cross.status);
  });

  it("cancel restores student; next day has no exception automatically", async () => {
    const db = baseDb();
    db.institute_settings = [
      {
        institute_id: INST_A,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        settings: {},
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const app = appWithDb(db);

    const create = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
      }),
    });
    const created = (await json(create)).data;

    const cancel = await app.request(
      `/api/v1/transport/daily-exceptions/${created.id}/cancel`,
      {
        method: "PATCH",
        headers: { Authorization: "Bearer token-parent" },
      },
    );
    expect(cancel.status).toBe(200);
    expect((await json(cancel)).data.cancelledAt).toBeTruthy();
    expect(db.transport_enrollment[0]?.status).toBe("active");
    expect(db.transport_enrollment[0]?.deleted_at).toBeNull();

    const tomorrow = "2099-01-02";
    const nextDay = await app.request(
      `/api/v1/transport/daily-exceptions/participation?institute_id=${INST_A}&student_id=${STUDENT_A}&date=${tomorrow}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(nextDay.status).toBe(200);
    const nextBody = await json(nextDay);
    expect(nextBody.data.ridingToday).toBe(true);
    expect(nextBody.data.exception).toBeNull();
  });

  it("admin can correct Not Riding and driver roster excludes student", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    db.institute_settings = [
      {
        institute_id: INST_A,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        settings: {},
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const app = appWithDb(db);

    const create = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        exception_type: "NOT_RIDING",
      }),
    });
    expect(create.status).toBe(201);
    const created = (await json(create)).data;
    expect(created.reason).toBe("admin");

    const roster = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(roster.status).toBe(200);
    const body = (await json(roster)).data;
    const studentA = body.students.find((s: { studentId: string }) => s.studentId === STUDENT_A);
    expect(studentA?.notRidingToday).toBe(true);
    expect(body.notRidingCount).toBeGreaterThanOrEqual(1);
    expect(body.expectedOnboardCount).toBe(body.expectedCount - body.notRidingCount);

    const cancel = await app.request(`/api/v1/transport/daily-exceptions/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cancel.status).toBe(200);

    const rosterAfter = await app.request(
      `/api/v1/transport/portal/driver-route-roster?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    const after = (await json(rosterAfter)).data;
    const restored = after.students.find((s: { studentId: string }) => s.studentId === STUDENT_A);
    expect(restored?.notRidingToday).toBe(false);
  });

  it("getEffectiveTripParticipants excludes NOT_RIDING students", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    db.institute_settings = [
      {
        institute_id: INST_A,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        settings: {},
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        service_date: today,
      }),
    });

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const tripId = (await json(start)).data.id;

    const effective = await app.request(
      `/api/v1/transport/trips/${tripId}/effective-participants`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(effective.status).toBe(200);
    const data = (await json(effective)).data;
    expect(data.expectedCount).toBe(2);
    expect(data.notRidingCount).toBe(1);
    expect(data.expectedOnboardCount).toBe(1);
    expect(data.expectedOnboard.map((p: { studentId: string }) => p.studentId)).toEqual([
      STUDENT_B,
    ]);
    expect(data.notRiding.map((p: { studentId: string }) => p.studentId)).toEqual([STUDENT_A]);
  });

  it("driver cannot create parent Not Riding exceptions", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("Phase 3 GPS: validate, authorize, idempotent client_event_id", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A, vehicle_id: VEHICLE_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const trip = (await json(start)).data;

    const invalid = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude: 999, longitude: 77.5 }),
    });
    expect(invalid.status).toBe(400);

    const unauthorized = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude: 12.97, longitude: 77.59, accuracy_m: 10 }),
    });
    expect([403, 404]).toContain(unauthorized.status);

    const crossDriver = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-other",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude: 12.97, longitude: 77.59, accuracy_m: 10 }),
    });
    expect([403, 404]).toContain(crossDriver.status);

    const clientEventId = "gps-evt-phase3-1";
    const ping1 = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: 12.97,
        longitude: 77.59,
        accuracy_m: 10,
        client_event_id: clientEventId,
        sequence_number: 1,
        captured_at: new Date().toISOString(),
      }),
    });
    expect(ping1.status).toBe(201);
    const body1 = await json(ping1);
    expect(body1.data.clientEventId).toBe(clientEventId);

    const ping2 = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: 12.98,
        longitude: 77.6,
        accuracy_m: 10,
        client_event_id: clientEventId,
        sequence_number: 1,
      }),
    });
    expect(ping2.status).toBe(201);
    const body2 = await json(ping2);
    expect(body2.data.id).toBe(body1.data.id);
    expect(body2.data.latitude).toBe(12.97);
    expect(db.vehicle_location.filter((r) => r.client_event_id === clientEventId)).toHaveLength(1);

    const trips = await app.request(
      `/api/v1/transport/trips?institute_id=${INST_A}&trip_date=${today}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(trips.status).toBe(200);
    const tripRow = ((await json(trips)).data as Array<{ id: string; gpsFreshness?: string }>).find(
      (t) => t.id === trip.id,
    );
    expect(tripRow?.gpsFreshness).toBeTruthy();
  });

  it("phase4: full journey, invalid transition, duplicate boarding, school arrival, parent drop notify", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    db.stop = db.stop.map((s) =>
      s.id === STOP_DROP
        ? { ...s, kind: "school", latitude: 12.98, longitude: 77.6, notification_radius_m: 200 }
        : { ...s, kind: s.kind ?? "waypoint" },
    );
    // Student B drops at pickup stop (not school) — drop plan must not coerce to school-only.
    db.transport_enrollment = db.transport_enrollment.map((e) =>
      e.student_id === STUDENT_B
        ? { ...e, drop_stop_id: STOP_PICKUP }
        : e,
    );
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    expect(start.status).toBe(201);
    const trip = (await json(start)).data;

    const invalid = await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "boarding" }),
    });
    expect(invalid.status).toBe(409);

    await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "running", current_stop_index: 0 }),
    });

    const board1 = await app.request(`/api/v1/transport/trips/${trip.id}/boarding`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_A,
        stop_id: STOP_PICKUP,
        boarding_status: "boarded",
        client_event_id: "board-dup-1",
      }),
    });
    expect(board1.status).toBe(200);
    const board1Body = await json(board1);

    const boardDup = await app.request(`/api/v1/transport/trips/${trip.id}/boarding`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_A,
        stop_id: STOP_PICKUP,
        boarding_status: "boarded",
        client_event_id: "board-dup-1",
      }),
    });
    expect(boardDup.status).toBe(200);
    expect((await json(boardDup)).data.id).toBe(board1Body.data.id);

    await app.request(`/api/v1/transport/trips/${trip.id}/boarding`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_B,
        stop_id: STOP_PICKUP,
        boarding_status: "boarded",
        client_event_id: "board-b-1",
      }),
    });

    const dropBeforeSchool = await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "dropping" }),
    });
    expect(dropBeforeSchool.status).toBe(409);

    // School geofence → SCHOOL_ARRIVED (no auto-board)
    const schoolPing = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: 12.98,
        longitude: 77.6,
        accuracy_m: 8,
        client_event_id: "gps-school-1",
      }),
    });
    expect(schoolPing.status).toBe(201);

    const afterSchool = await app.request(`/api/v1/transport/trips/${trip.id}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(afterSchool.status).toBe(200);
    const schoolTrip = (await json(afterSchool)).data;
    expect(schoolTrip.schoolArrivedAt).toBeTruthy();
    expect(
      (schoolTrip.timeline as Array<{ kind: string }>).some(
        (e) => e.kind === "SCHOOL_ARRIVED",
      ),
    ).toBe(true);
    expect(schoolTrip.dropStopPlan?.map((s: { id: string }) => s.id)).toEqual(
      expect.arrayContaining([STOP_PICKUP, STOP_DROP]),
    );

    const startDrop = await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "dropping" }),
    });
    expect(startDrop.status).toBe(200);

    const notifsBefore = db.notification?.length ?? 0;

    await app.request(`/api/v1/transport/trips/${trip.id}/dropping`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_A,
        stop_id: STOP_DROP,
        dropping_status: "dropped",
        client_event_id: "drop-a-1",
      }),
    });

    await app.request(`/api/v1/transport/trips/${trip.id}/dropping`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_B,
        stop_id: STOP_PICKUP,
        dropping_status: "dropped",
        client_event_id: "drop-b-1",
      }),
    });

    const completed = await app.request(`/api/v1/transport/trips/${trip.id}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    const done = (await json(completed)).data;
    expect(done.phase).toBe("completed");
    expect(done.finalized).toBe(true);
    expect(
      (done.timeline as Array<{ kind: string }>).some(
        (e) => e.kind === "TRIP_COMPLETED",
      ),
    ).toBe(true);

    // Parent drop notification emitted after backend confirmation.
    const notifs = (db.notification ?? []) as Array<{
      category?: string;
      title?: string;
      payload?: { kind?: string };
    }>;
    expect(notifs.length).toBeGreaterThan(notifsBefore);
    expect(
      notifs.some(
        (n) =>
          n.category === "transport" &&
          (n.payload?.kind === "STUDENT_DROPPED" ||
            String(n.title ?? "").toLowerCase().includes("dropped")),
      ),
    ).toBe(true);
  });

  it("phase5: repeated GPS → one arrival push; boarding/drop dedupe; not-riding suppresses reminder", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    db.transport_settings = [
      {
        institute_id: INST_A,
        default_notification_radius_m: 150,
        default_pickup_buffer_mins: 5,
        working_days: [1, 2, 3, 4, 5],
        notifications_enabled: true,
        remember_enabled: true,
        default_pickup_time: "08:10:00",
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    const trip = (await json(start)).data;
    await app.request(`/api/v1/transport/trips/${trip.id}/phase`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phase: "running", current_stop_index: 0 }),
    });

    const pingBody = {
      latitude: 12.9701,
      longitude: 77.59,
      accuracy_m: 8,
    };
    for (let i = 0; i < 3; i += 1) {
      const ping = await app.request(`/api/v1/transport/trips/${trip.id}/location`, {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...pingBody,
          client_event_id: `gps-arr-${i}`,
        }),
      });
      expect(ping.status).toBe(201);
    }

    const arrivalNotifs = db.notification.filter(
      (n) =>
        n.dedupe_key === `transport:${trip.id}:stop:${STOP_PICKUP}:arrived`,
    );
    expect(arrivalNotifs).toHaveLength(1);
    expect(arrivalNotifs[0]?.priority).not.toBe("critical");

    const board1 = await app.request(`/api/v1/transport/trips/${trip.id}/boarding`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: STUDENT_A,
        stop_id: STOP_PICKUP,
        boarding_status: "boarded",
        client_event_id: "board-p5-1",
      }),
    });
    expect(board1.status).toBe(200);

    // Worker/retry style: same boarding business notification dedupe
    const boardNotifs = db.notification.filter(
      (n) =>
        n.dedupe_key === `transport:${trip.id}:student:${STUDENT_A}:boarded`,
    );
    expect(boardNotifs).toHaveLength(1);
    expect(boardNotifs[0]?.deep_link).toBe("/transport");

    // Not Riding → reminder job skips student
    const nr = await app.request("/api/v1/transport/daily-exceptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        service_date: today,
      }),
    });
    expect(nr.status).toBe(201);
    expect(
      db.notification.some(
        (n) =>
          typeof n.dedupe_key === "string" &&
          String(n.dedupe_key).includes(`not_riding:${STUDENT_A}:${today}`),
      ),
    ).toBe(true);

    const { admin } = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    });
    const { processTransportRemindersSystem } = await import(
      "../src/domains/transport/transport-reminders.js"
    );
    // Morning window in Asia/Kolkata — ~06:30 IST
    const morningUtc = new Date(`${today}T01:00:00.000Z`);
    await processTransportRemindersSystem(admin, morningUtc);

    // STUDENT_A not riding — no morning_service reminder for them
    expect(
      db.notification.some(
        (n) =>
          n.dedupe_key ===
          `transport:${ROUTE_A}:reminder:${STUDENT_A}:morning_service:${today}`,
      ),
    ).toBe(false);
  });

  it("phase5: emergency is critical; arrival soft-chime is not alert channel", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);

    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    const trip = (await json(start)).data;

    const sos = await app.request("/api/v1/transport/emergencies", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        trip_id: trip.id,
        driver_id: DRIVER_A,
        vehicle_id: VEHICLE_A,
        emergency_type: "breakdown",
        note: "Bus stalled",
      }),
    });
    expect(sos.status).toBe(201);
    const emergencyNotifs = db.notification.filter(
      (n) =>
        typeof n.dedupe_key === "string" &&
        String(n.dedupe_key).startsWith("transport:sos:"),
    );
    expect(emergencyNotifs.length).toBeGreaterThanOrEqual(1);
    const staffSos = emergencyNotifs.find((n) =>
      String(n.dedupe_key).endsWith(":admin"),
    );
    const parentSos = emergencyNotifs.find((n) =>
      String(n.dedupe_key).endsWith(":parent"),
    );
    expect(staffSos?.priority).toBe("critical");
    expect((staffSos?.payload as { severity?: string })?.severity).toBe(
      "critical",
    );
    expect(staffSos?.deep_link).toBe("/transport");
    expect(parentSos?.priority).toBe("critical");
    expect(parentSos?.deep_link).toBe("/transport/live");
    // Relevant parent only — USER_PARENT is guardian of STUDENT_A on ROUTE_A.
    const parentRecipients = (db.notification_recipient ?? []).filter(
      (r: { notification_id?: string; user_profile_id?: string }) =>
        r.notification_id === parentSos?.id,
    );
    expect(
      parentRecipients.some(
        (r: { user_profile_id?: string }) => r.user_profile_id === USER_PARENT,
      ),
    ).toBe(true);

    const { isAlertNotificationRow } = await import(
      "../src/domains/notifications/fcm-enqueue.js"
    );
    expect(
      isAlertNotificationRow({
        id: "n1",
        institute_id: INST_A,
        template_id: null,
        category: "transport",
        priority: "normal",
        title: "arrived",
        body: "x",
        payload: { presentation: "chime", severity: "info" },
        deep_link: "/transport/live",
        dedupe_key: null,
        due_at: null,
        created_by_user_profile_id: null,
        created_at: "",
        updated_at: "",
        deleted_at: null,
      }),
    ).toBe(false);
    expect(
      isAlertNotificationRow({
        id: "n2",
        institute_id: INST_A,
        template_id: null,
        category: "transport",
        priority: "critical",
        title: "sos",
        body: "x",
        payload: { presentation: "alert", severity: "critical" },
        deep_link: "/transport",
        dedupe_key: null,
        due_at: null,
        created_by_user_profile_id: null,
        created_at: "",
        updated_at: "",
        deleted_at: null,
      }),
    ).toBe(true);
  });

  it("SOS resolve persists staff and parent notifications before HTTP completes", async () => {
    const db = baseDb();
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const today = new Date().toISOString().slice(0, 10);
    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    const trip = (await json(start)).data;
    const sos = await app.request("/api/v1/transport/emergencies", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        trip_id: trip.id,
        driver_id: DRIVER_A,
        vehicle_id: VEHICLE_A,
        emergency_type: "breakdown",
        note: "Bus stalled",
      }),
    });
    expect(sos.status).toBe(201);
    const emergency = (await json(sos)).data;
    const resolve = await app.request(
      `/api/v1/transport/emergencies/${emergency.id}/resolve`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resolve_note: "Cleared" }),
      },
    );
    expect(resolve.status).toBe(200);
    const resolvedKeys = db.notification.filter(
      (n) =>
        typeof n.dedupe_key === "string" &&
        String(n.dedupe_key).startsWith("transport:sos_resolved:"),
    );
    expect(resolvedKeys.some((n) => String(n.dedupe_key).endsWith(":admin"))).toBe(
      true,
    );
    expect(resolvedKeys.some((n) => String(n.dedupe_key).endsWith(":parent"))).toBe(
      true,
    );
    expect(resolvedKeys.every((n) => n.priority !== "critical")).toBe(true);

    const again = await app.request(
      `/api/v1/transport/emergencies/${emergency.id}/resolve`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    expect(again.status).toBe(409);
    expect(
      db.notification.filter(
        (n) =>
          typeof n.dedupe_key === "string" &&
          String(n.dedupe_key).startsWith("transport:sos_resolved:"),
      ),
    ).toHaveLength(resolvedKeys.length);
  });

  it("reminders: pre_pickup, trip_not_started, gps_stale, timezone, idempotency", async () => {
    const db = baseDb();
    db.institute_settings = [
      {
        institute_id: INST_A,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        settings: {},
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    db.transport_settings = [
      {
        institute_id: INST_A,
        default_notification_radius_m: 150,
        default_pickup_buffer_mins: 5,
        working_days: [1, 2, 3, 4, 5],
        notifications_enabled: true,
        remember_enabled: true,
        default_pickup_time: "08:10:00",
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const { admin } = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    });
    const { wallClockToUtc } = await import(
      "../src/domains/transport/daily-exception-service.js"
    );
    const { processTransportRemindersSystem } = await import(
      "../src/domains/transport/transport-reminders.js"
    );
    const serviceDate = "2026-10-06";
    const prePickupNow = wallClockToUtc(serviceDate, "08:06:00", "Asia/Kolkata");
    await processTransportRemindersSystem(admin, prePickupNow);
    await processTransportRemindersSystem(admin, prePickupNow);
    const prePickup = db.notification.filter(
      (n) =>
        n.dedupe_key ===
        `transport:${ROUTE_A}:reminder:${STUDENT_A}:pre_pickup:${serviceDate}`,
    );
    expect(prePickup).toHaveLength(1);
    expect(prePickup[0]?.priority).not.toBe("critical");

    const notStartedNow = wallClockToUtc(
      serviceDate,
      "08:12:00",
      "Asia/Kolkata",
    );
    await processTransportRemindersSystem(admin, notStartedNow);
    await processTransportRemindersSystem(admin, notStartedNow);
    const notStarted = db.notification.filter(
      (n) => n.dedupe_key === `transport:${ROUTE_A}:not_started:${serviceDate}`,
    );
    expect(notStarted).toHaveLength(1);
    expect(notStarted[0]?.priority).not.toBe("critical");

    db.transport_trip = [
      {
        id: "t1111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        slot: "morning",
        trip_date: serviceDate,
        phase: "running",
        started_at: `${serviceDate}T02:40:00.000Z`,
        completed_at: null,
        current_stop_id: STOP_PICKUP,
        current_stop_index: 0,
        finalized: false,
        timeline: [],
        school_arrived_at: null,
        client_event_id: "trip-stale",
        created_at: `${serviceDate}T02:40:00.000Z`,
        updated_at: `${serviceDate}T02:40:00.000Z`,
        deleted_at: null,
      },
    ];
    db.vehicle_location = [
      {
        id: "vl111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        trip_id: "t1111111-1111-4111-8111-111111111111",
        vehicle_id: VEHICLE_A,
        latitude: 12.97,
        longitude: 77.59,
        accuracy_m: 8,
        // ~8 minutes before 08:45 IST (03:15 UTC) → GPS_STALE band (5–19 min), not offline.
        captured_at: "2026-10-06T03:07:00.000Z",
        client_event_id: "gps-old",
        driver_id: DRIVER_A,
        sequence_number: 1,
      },
    ];
    const staleNow = wallClockToUtc(serviceDate, "08:45:00", "Asia/Kolkata");
    await processTransportRemindersSystem(admin, staleNow);
    await processTransportRemindersSystem(admin, staleNow);
    const stale = db.notification.filter(
      (n) =>
        typeof n.dedupe_key === "string" &&
        String(n.dedupe_key).startsWith(
          "transport:t1111111-1111-4111-8111-111111111111:gps_stale",
        ),
    );
    expect(stale.length).toBeGreaterThanOrEqual(1);
    expect(stale).toHaveLength(1);

    db.transport_trip[0] = {
      ...db.transport_trip[0],
      phase: "dropping",
      school_arrived_at: `${serviceDate}T03:00:00.000Z`,
    };
    const beforeParked = db.notification.length;
    await processTransportRemindersSystem(admin, staleNow);
    expect(db.notification.length).toBe(beforeParked);

    db.institute_settings[0] = {
      ...db.institute_settings[0],
      timezone: "America/New_York",
    };
    const nyMorning = wallClockToUtc(
      serviceDate,
      "06:30:00",
      "America/New_York",
    );
    await processTransportRemindersSystem(admin, nyMorning);
    expect(
      db.notification.some(
        (n) =>
          n.dedupe_key ===
          `transport:${ROUTE_A}:reminder:${STUDENT_A}:morning_service:${serviceDate}`,
      ),
    ).toBe(true);
  });

  it("driver enrollment is immediately usable without approval", async () => {
    const STUDENT_C = "ac333333-3333-4333-8333-333333333333";
    const db = baseDb();
    db.student.push({
      id: STUDENT_C,
      institute_id: INST_A,
      display_name: "Kid C",
      first_name: "Kid",
      surname: "C",
      deleted_at: null,
    });
    db.route[0] = { ...db.route[0], driver_id: DRIVER_A };
    const app = appWithDb(db);
    const created = await app.request("/api/v1/transport/enrollments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_C,
        route_id: ROUTE_A,
        pickup_stop_id: STOP_PICKUP,
        drop_stop_id: STOP_DROP,
      }),
    });
    expect(created.status).toBe(201);
    const enrollment = (await json(created)).data;
    expect(enrollment.approvalStatus).toBe("pending");
    expect(enrollment.status).toBe("active");

    const adminList = await app.request(
      `/api/v1/transport/enrollments?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(adminList.status).toBe(200);
    expect(
      (await json(adminList)).data.some((e: { studentId?: string }) => e.studentId === STUDENT_C),
    ).toBe(true);

    const driverList = await app.request(
      `/api/v1/transport/enrollments?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(driverList.status).toBe(200);
    expect(
      (await json(driverList)).data.some((e: { studentId?: string }) => e.studentId === STUDENT_C),
    ).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const start = await app.request("/api/v1/transport/trips", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-driver",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        route_id: ROUTE_A,
        vehicle_id: VEHICLE_A,
        driver_id: DRIVER_A,
        trip_date: today,
      }),
    });
    const trip = (await json(start)).data;
    const roster = await app.request(
      `/api/v1/transport/trips/${trip.id}/effective-participants`,
      { headers: { Authorization: "Bearer token-driver" } },
    );
    expect(roster.status).toBe(200);
    const participants = (await json(roster)).data.participants as Array<{
      studentId: string;
    }>;
    expect(participants.some((p) => p.studentId === STUDENT_C)).toBe(true);

    const foreign = await app.request("/api/v1/transport/enrollments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-other",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_C,
        route_id: ROUTE_A,
        pickup_stop_id: STOP_PICKUP,
        drop_stop_id: STOP_DROP,
      }),
    });
    expect([403, 404, 409]).toContain(foreign.status);
  });

  describe("phase9 security IDOR", () => {
    const USER_DRIVER_B = "77777777-7777-4777-8777-777777777777";
    const MEMBER_DRIVER_B = "aa777777-7777-4777-8777-777777777777";
    const DRIVER_B = "d2222222-2222-4222-8222-222222222222";
    const VEHICLE_C = "ee333333-3333-4333-8333-333333333333";
    const ROUTE_B = "af222222-2222-4222-8222-222222222222";
    const STUDENT_C = "ac333333-3333-4333-8333-333333333333";
    const STOP_FOREIGN = "b0333333-3333-4333-8333-333333333333";

    function phase9Db(): MockDb {
      const db = baseDb();
      db.user_profile.push({
        id: USER_DRIVER_B,
        display_name: "Driver B",
        email: "db@x.com",
        status: "active",
        deleted_at: null,
      });
      db.membership.push({
        id: MEMBER_DRIVER_B,
        user_id: USER_DRIVER_B,
        institute_id: INST_A,
        status: "active",
        deleted_at: null,
      });
      db.membership_role.push({
        membership_id: MEMBER_DRIVER_B,
        role_code: "driver",
      });
      db.vehicle.push({
        id: VEHICLE_C,
        institute_id: INST_A,
        vehicle_number: "BUS-2",
        registration_number: "KA01EF9999",
        capacity: 40,
        status: "active",
        notes: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      });
      db.driver.push({
        id: DRIVER_B,
        institute_id: INST_A,
        user_profile_id: USER_DRIVER_B,
        display_name: "Driver B",
        phone: "8888888888",
        license_number: "DL-2",
        license_expiry: null,
        status: "active",
        notes: null,
        assigned_vehicle_id: VEHICLE_C,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      });
      db.route.push({
        id: ROUTE_B,
        institute_id: INST_A,
        name: "South Loop",
        vehicle_id: VEHICLE_C,
        driver_id: DRIVER_B,
        status: "active",
        config_status: "configured",
        locked_at: null,
        locked_by_user_id: null,
        setup_finished_at: null,
        approval_status: "approved",
        submitted_by_user_id: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      });
      db.stop.push({
        id: STOP_FOREIGN,
        institute_id: INST_A,
        route_id: ROUTE_B,
        name: "Foreign Stop",
        location_label: "Other side",
        latitude: 12.9,
        longitude: 77.5,
        route_order: 0,
        notification_radius_m: 150,
        approval_status: "approved",
        submitted_by_user_id: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      });
      db.student.push({
        id: STUDENT_C,
        institute_id: INST_A,
        display_name: "Kid C",
        first_name: "Kid",
        surname: "C",
        deleted_at: null,
      });
      return db;
    }

    function appPhase9(db: MockDb) {
      const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
      return createApp(
        env,
        silentLogger,
        createMockSupabaseClients({
          tokens: {
            "token-admin": USER_ADMIN,
            "token-teacher": USER_TEACHER,
            "token-parent": USER_PARENT,
            "token-other": USER_OTHER,
            "token-driver": USER_DRIVER,
            "token-driver-b": USER_DRIVER_B,
          },
          db,
        }),
      );
    }

    it("blocks cross-institute vehicle/trip access", async () => {
      const app = appPhase9(phase9Db());
      expect(
        (
          await app.request(`/api/v1/transport/vehicles?institute_id=${INST_B}`, {
            headers: { Authorization: "Bearer token-admin" },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request(`/api/v1/transport/vehicles/${VEHICLE_B}`, {
            headers: { Authorization: "Bearer token-admin" },
          })
        ).status,
      ).toBe(403);
    });

    it("blocks cross-driver trip start, bus, route, and SOS", async () => {
      const db = phase9Db();
      const app = appPhase9(db);
      const today = new Date().toISOString().slice(0, 10);

      const stealBus = await app.request(`/api/v1/transport/vehicles/${VEHICLE_C}`, {
        headers: { Authorization: "Bearer token-driver" },
      });
      expect(stealBus.status).toBe(403);

      const stealRoute = await app.request(`/api/v1/transport/routes/${ROUTE_B}`, {
        headers: { Authorization: "Bearer token-driver" },
      });
      expect(stealRoute.status).toBe(403);

      const startOther = await app.request("/api/v1/transport/trips", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          route_id: ROUTE_B,
          vehicle_id: VEHICLE_C,
          driver_id: DRIVER_B,
          trip_date: today,
        }),
      });
      expect(startOther.status).toBe(403);

      const spoofSelfOnOther = await app.request("/api/v1/transport/trips", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          route_id: ROUTE_B,
          vehicle_id: VEHICLE_C,
          driver_id: DRIVER_A,
          trip_date: today,
        }),
      });
      expect(spoofSelfOnOther.status).toBe(403);

      const activeOther = await app.request(
        `/api/v1/transport/vehicles/${VEHICLE_C}/active-trip`,
        { headers: { Authorization: "Bearer token-driver" } },
      );
      expect(activeOther.status).toBe(403);

      const sosOther = await app.request("/api/v1/transport/emergencies", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          driver_id: DRIVER_A,
          vehicle_id: VEHICLE_C,
          emergency_type: "general",
        }),
      });
      expect(sosOther.status).toBe(403);
    });

    it("blocks parent accessing another student live/history/enrollment", async () => {
      const app = appPhase9(phase9Db());
      expect(
        (
          await app.request(
            `/api/v1/transport/portal/learner-transport/live?institute_id=${INST_A}&student_id=${STUDENT_B}`,
            { headers: { Authorization: "Bearer token-parent" } },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request(
            `/api/v1/transport/portal/learner-transport/history?institute_id=${INST_A}&student_id=${STUDENT_B}`,
            { headers: { Authorization: "Bearer token-parent" } },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request(`/api/v1/transport/enrollments/${ENROLL_OTHER}`, {
            headers: { Authorization: "Bearer token-parent" },
          })
        ).status,
      ).toBe(403);
    });

    it("blocks arbitrary trip/stop/enrollment/boarding IDs for drivers", async () => {
      const db = phase9Db();
      const app = appPhase9(db);
      const today = new Date().toISOString().slice(0, 10);

      const startB = await app.request("/api/v1/transport/trips", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver-b",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          route_id: ROUTE_B,
          vehicle_id: VEHICLE_C,
          driver_id: DRIVER_B,
          trip_date: today,
        }),
      });
      expect(startB.status).toBe(201);
      const tripB = (await json(startB)).data.id as string;

      expect(
        (
          await app.request(`/api/v1/transport/trips/${tripB}`, {
            headers: { Authorization: "Bearer token-driver" },
          })
        ).status,
      ).toBe(403);

      const startA = await app.request("/api/v1/transport/trips", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          route_id: ROUTE_A,
          vehicle_id: VEHICLE_A,
          driver_id: DRIVER_A,
          trip_date: today,
        }),
      });
      expect(startA.status).toBe(201);
      const tripA = (await json(startA)).data.id as string;

      const foreignStudent = await app.request(
        `/api/v1/transport/trips/${tripA}/boarding`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer token-driver",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: STUDENT_C,
            stop_id: STOP_PICKUP,
            boarding_status: "boarded",
            client_event_id: "board-foreign-student",
          }),
        },
      );
      expect(foreignStudent.status).toBe(403);

      const foreignStop = await app.request(
        `/api/v1/transport/trips/${tripA}/boarding`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer token-driver",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: STUDENT_A,
            stop_id: STOP_FOREIGN,
            boarding_status: "boarded",
            client_event_id: "board-foreign-stop",
          }),
        },
      );
      expect(foreignStop.status).toBe(400);

      const enrollOtherRoute = await app.request("/api/v1/transport/enrollments", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          student_id: STUDENT_C,
          route_id: ROUTE_B,
        }),
      });
      expect(enrollOtherRoute.status).toBe(403);
    });

    it("scopes driver lists; soft-deleted trip hidden; analytics elevated-only", async () => {
      const db = phase9Db();
      const app = appPhase9(db);

      const vehicles = await app.request(
        `/api/v1/transport/vehicles?institute_id=${INST_A}`,
        { headers: { Authorization: "Bearer token-driver" } },
      );
      expect(vehicles.status).toBe(200);
      const vehicleIds = ((await json(vehicles)).data as Array<{ id: string }>).map(
        (v) => v.id,
      );
      expect(vehicleIds).toEqual([VEHICLE_A]);

      const routes = await app.request(
        `/api/v1/transport/routes?institute_id=${INST_A}`,
        { headers: { Authorization: "Bearer token-driver" } },
      );
      expect(routes.status).toBe(200);
      const routeIds = ((await json(routes)).data as Array<{ id: string }>).map(
        (r) => r.id,
      );
      expect(routeIds).toEqual([ROUTE_A]);

      expect(
        (
          await app.request(`/api/v1/transport/analytics?institute_id=${INST_A}`, {
            headers: { Authorization: "Bearer token-driver" },
          })
        ).status,
      ).toBe(403);

      const today = new Date().toISOString().slice(0, 10);
      const start = await app.request("/api/v1/transport/trips", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-driver",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          route_id: ROUTE_A,
          vehicle_id: VEHICLE_A,
          driver_id: DRIVER_A,
          trip_date: today,
        }),
      });
      const tripId = (await json(start)).data.id as string;
      const tripRow = db.transport_trip.find((t) => t.id === tripId);
      expect(tripRow).toBeTruthy();
      tripRow!.deleted_at = new Date().toISOString();

      expect(
        (
          await app.request(`/api/v1/transport/trips/${tripId}`, {
            headers: { Authorization: "Bearer token-admin" },
          })
        ).status,
      ).toBe(404);
    });

    it("daily exception: parent own only; driver roster-scoped; driver cannot create", async () => {
      const db = phase9Db();
      db.institute_settings = [
        {
          institute_id: INST_A,
          timezone: "Asia/Kolkata",
          locale: "en-IN",
          settings: {},
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-01T00:00:00.000Z",
        },
      ];
      const app = appPhase9(db);
      const today = new Date().toISOString().slice(0, 10);

      expect(
        (
          await app.request("/api/v1/transport/daily-exceptions", {
            method: "POST",
            headers: {
              Authorization: "Bearer token-parent",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              institute_id: INST_A,
              student_id: STUDENT_B,
              service_date: today,
            }),
          })
        ).status,
      ).toBe(403);

      await app.request("/api/v1/transport/daily-exceptions", {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute_id: INST_A,
          student_id: STUDENT_A,
          service_date: today,
        }),
      });

      const driverList = await app.request(
        `/api/v1/transport/daily-exceptions?institute_id=${INST_A}&service_date=${today}`,
        { headers: { Authorization: "Bearer token-driver" } },
      );
      expect(driverList.status).toBe(200);
      const listed = (await json(driverList)).data as Array<{ studentId: string }>;
      expect(listed.every((r) => [STUDENT_A, STUDENT_B].includes(r.studentId))).toBe(
        true,
      );

      expect(
        (
          await app.request("/api/v1/transport/daily-exceptions", {
            method: "POST",
            headers: {
              Authorization: "Bearer token-driver",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              institute_id: INST_A,
              student_id: STUDENT_A,
            }),
          })
        ).status,
      ).toBe(403);
    });
  });
});
