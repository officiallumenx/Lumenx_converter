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
      driver_id: null,
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
      }),
    });
    expect(driver.status).toBe(201);
    const driverId = (await json(driver)).data.id;

    const route = await app.request("/api/v1/transport/routes", {
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
    expect(route.status).toBe(201);
    const routeBody = await json(route);
    expect(routeBody.data.vehicleId).toBe(vehicleId);
    expect(routeBody.data.driverId).toBe(driverId);
    const routeId = routeBody.data.id;

    const stop = await app.request("/api/v1/transport/stops", {
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
    expect(stop.status).toBe(201);
    const stopId = (await json(stop)).data.id;

    const stop2 = await app.request("/api/v1/transport/stops", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
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
        user_profile_id: USER_TEACHER,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.userProfileId).toBeNull();
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
      }),
    });
    expect(boarding.status).toBe(200);
    expect((await json(boarding)).data.boardingStatus).toBe("boarded");

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
  });
});
