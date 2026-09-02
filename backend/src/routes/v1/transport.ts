import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../validation/validate.js";
import {
  approveTransportEnrollmentForActor,
  approveTransportRouteForActor,
  approveTransportStopForActor,
  deleteRejectedTransportEnrollmentForActor,
  deleteRejectedTransportRouteForActor,
  deleteRejectedTransportStopForActor,
  getDriverMeForActor,
  getLearnerTransportForActor,
  listTeacherClassTransportForActor,
  listTransportReviewQueueForActor,
  rejectTransportEnrollmentForActor,
  rejectTransportRouteForActor,
  rejectTransportStopForActor,
} from "../../domains/transport/approval-service.js";
import {
  acknowledgeEmergencyForActor,
  createEmergencyForActor,
  endTripForActor,
  getActiveTripForVehicleForActor,
  getOpenEmergencyForVehicleForActor,
  getLearnerTransportLiveForActor,
  getTripForActor,
  listBoardingForTripForActor,
  listBoardingMarksForInstituteForActor,
  listEmergenciesForActor,
  listTripsForActor,
  pingLocationForActor,
  resolveEmergencyForActor,
  startTripForActor,
  updateTripPhaseForActor,
  upsertBoardingForActor,
  upsertDroppingForActor,
} from "../../domains/transport/ops-service.js";
import {
  createDriverForActor,
  createEnrollmentForActor,
  createRouteForActor,
  createStopForActor,
  createVehicleForActor,
  deleteDriverForActor,
  deleteEnrollmentForActor,
  deleteRouteForActor,
  deleteStopForActor,
  deleteVehicleForActor,
  getDriverForActor,
  getEnrollmentForActor,
  getRouteForActor,
  getStopForActor,
  getTransportSettingsForActor,
  getVehicleForActor,
  listDriversForActor,
  listEnrollmentsForActor,
  listRoutesForActor,
  listStopsForActor,
  listVehiclesForActor,
  updateDriverForActor,
  updateEnrollmentForActor,
  updateRouteForActor,
  updateStopForActor,
  updateVehicleForActor,
  upsertTransportSettingsForActor,
} from "../../domains/transport/service.js";

const transport = new Hono<AppBindings>();
transport.use("*", requireAuth);

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const uuid = z.string().uuid();
const idParamsSchema = z.object({ id: uuid });
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .nullable()
  .optional();
const assetStatusSchema = z.enum(["active", "inactive", "maintenance"]);
const configStatusSchema = z.enum(["not_configured", "configured", "locked"]);
const enrollmentStatusSchema = z.enum(["active", "inactive", "ended"]);

// ── Vehicles ─────────────────────────────────────────────────────

transport.get("/vehicles", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listVehiclesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

transport.post("/vehicles", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      vehicle_number: z.string().min(1).max(100),
      registration_number: z.string().min(1).max(100),
      capacity: z.number().int().positive(),
      status: assetStatusSchema.optional(),
      notes: z.string().max(2000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createVehicleForActor(admin, actor, {
    instituteId: body.institute_id,
    vehicleNumber: body.vehicle_number,
    registrationNumber: body.registration_number,
    capacity: body.capacity,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

transport.get("/vehicles/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getVehicleForActor(admin, actor, id);
  return c.json({ data });
});

transport.patch("/vehicles/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        vehicle_number: z.string().min(1).max(100).optional(),
        registration_number: z.string().min(1).max(100).optional(),
        capacity: z.number().int().positive().optional(),
        status: assetStatusSchema.optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateVehicleForActor(admin, actor, id, {
    vehicleNumber: body.vehicle_number,
    registrationNumber: body.registration_number,
    capacity: body.capacity,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data });
});

transport.delete("/vehicles/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteVehicleForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Drivers ──────────────────────────────────────────────────────

transport.get("/drivers", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listDriversForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

transport.post("/drivers", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      display_name: z.string().min(1).max(200),
      phone: z.string().min(1).max(40),
      license_number: z.string().min(1).max(100),
      license_expiry: dateOnly,
      status: assetStatusSchema.optional(),
      notes: z.string().max(2000).nullable().optional(),
      user_profile_id: uuid.nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createDriverForActor(admin, actor, {
    instituteId: body.institute_id,
    displayName: body.display_name,
    phone: body.phone,
    licenseNumber: body.license_number,
    licenseExpiry: body.license_expiry,
    status: body.status,
    notes: body.notes,
    userProfileId: body.user_profile_id,
  });
  return c.json({ data }, 201);
});

transport.get("/drivers/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getDriverForActor(admin, actor, id);
  return c.json({ data });
});

transport.patch("/drivers/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        display_name: z.string().min(1).max(200).optional(),
        phone: z.string().min(1).max(40).optional(),
        license_number: z.string().min(1).max(100).optional(),
        license_expiry: dateOnly,
        status: assetStatusSchema.optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateDriverForActor(admin, actor, id, {
    displayName: body.display_name,
    phone: body.phone,
    licenseNumber: body.license_number,
    licenseExpiry: body.license_expiry,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data });
});

transport.delete("/drivers/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteDriverForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Routes ───────────────────────────────────────────────────────

transport.get("/routes", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listRoutesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

transport.post("/routes", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(200),
      vehicle_id: uuid.nullable().optional(),
      driver_id: uuid.nullable().optional(),
      status: assetStatusSchema.optional(),
      config_status: configStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createRouteForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    vehicleId: body.vehicle_id,
    driverId: body.driver_id,
    status: body.status,
    configStatus: body.config_status,
  });
  return c.json({ data }, 201);
});

transport.get("/routes/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getRouteForActor(admin, actor, id);
  return c.json({ data });
});

transport.patch("/routes/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        vehicle_id: uuid.nullable().optional(),
        driver_id: uuid.nullable().optional(),
        status: assetStatusSchema.optional(),
        config_status: configStatusSchema.optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateRouteForActor(admin, actor, id, {
    name: body.name,
    vehicleId: body.vehicle_id,
    driverId: body.driver_id,
    status: body.status,
    configStatus: body.config_status,
  });
  return c.json({ data });
});

transport.delete("/routes/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteRouteForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Stops ────────────────────────────────────────────────────────

transport.get("/stops", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(z.object({ route_id: uuid }), c.req.query());
  const data = await listStopsForActor(admin, actor, query.route_id);
  return c.json({ data });
});

transport.post("/stops", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      route_id: uuid,
      name: z.string().min(1).max(200),
      location_label: z.string().min(1).max(500),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      route_order: z.number().int().min(0),
      notification_radius_m: z.number().int().positive().optional(),
    }),
    await c.req.json(),
  );
  const data = await createStopForActor(admin, actor, {
    instituteId: body.institute_id,
    routeId: body.route_id,
    name: body.name,
    locationLabel: body.location_label,
    latitude: body.latitude,
    longitude: body.longitude,
    routeOrder: body.route_order,
    notificationRadiusM: body.notification_radius_m,
  });
  return c.json({ data }, 201);
});

transport.get("/stops/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getStopForActor(admin, actor, id);
  return c.json({ data });
});

transport.patch("/stops/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        location_label: z.string().min(1).max(500).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        route_order: z.number().int().min(0).optional(),
        notification_radius_m: z.number().int().positive().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateStopForActor(admin, actor, id, {
    name: body.name,
    locationLabel: body.location_label,
    latitude: body.latitude,
    longitude: body.longitude,
    routeOrder: body.route_order,
    notificationRadiusM: body.notification_radius_m,
  });
  return c.json({ data });
});

transport.delete("/stops/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteStopForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Enrollments ──────────────────────────────────────────────────

transport.get("/enrollments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listEnrollmentsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

transport.post("/enrollments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      student_id: uuid,
      route_id: uuid,
      pickup_stop_id: uuid,
      drop_stop_id: uuid,
      status: enrollmentStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createEnrollmentForActor(admin, actor, {
    instituteId: body.institute_id,
    studentId: body.student_id,
    routeId: body.route_id,
    pickupStopId: body.pickup_stop_id,
    dropStopId: body.drop_stop_id,
    status: body.status,
  });
  return c.json({ data }, 201);
});

transport.get("/enrollments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getEnrollmentForActor(admin, actor, id);
  return c.json({ data });
});

transport.patch("/enrollments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        route_id: uuid.optional(),
        pickup_stop_id: uuid.optional(),
        drop_stop_id: uuid.optional(),
        status: enrollmentStatusSchema.optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateEnrollmentForActor(admin, actor, id, {
    routeId: body.route_id,
    pickupStopId: body.pickup_stop_id,
    dropStopId: body.drop_stop_id,
    status: body.status,
  });
  return c.json({ data });
});

transport.delete("/enrollments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteEnrollmentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Settings ─────────────────────────────────────────────────────

transport.get("/settings", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await getTransportSettingsForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

transport.put("/settings", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const body = validateBody(
    z.object({
      default_notification_radius_m: z.number().int().positive().optional(),
      default_pickup_buffer_mins: z.number().int().min(0).optional(),
      working_days: z.array(z.number().int().min(0).max(6)).optional(),
    }),
    await c.req.json(),
  );
  const data = await upsertTransportSettingsForActor(admin, actor, {
    instituteId: query.institute_id,
    defaultNotificationRadiusM: body.default_notification_radius_m,
    defaultPickupBufferMins: body.default_pickup_buffer_mins,
    workingDays: body.working_days,
  });
  return c.json({ data });
});

// ── Approval workflow ────────────────────────────────────────────

transport.get("/review-queue", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listTransportReviewQueueForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

transport.post("/routes/:id/approve", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await approveTransportRouteForActor(admin, actor, id);
  return c.json({ data });
});

transport.post("/routes/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({ reason: z.string().min(1).max(2000) }),
    await c.req.json(),
  );
  const data = await rejectTransportRouteForActor(admin, actor, id, body.reason);
  return c.json({ data });
});

transport.delete("/routes/:id/rejected", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteRejectedTransportRouteForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

transport.post("/stops/:id/approve", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await approveTransportStopForActor(admin, actor, id);
  return c.json({ data });
});

transport.post("/stops/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({ reason: z.string().min(1).max(2000) }),
    await c.req.json(),
  );
  const data = await rejectTransportStopForActor(admin, actor, id, body.reason);
  return c.json({ data });
});

transport.delete("/stops/:id/rejected", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteRejectedTransportStopForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

transport.post("/enrollments/:id/approve", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await approveTransportEnrollmentForActor(admin, actor, id);
  return c.json({ data });
});

transport.post("/enrollments/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({ reason: z.string().min(1).max(2000) }),
    await c.req.json(),
  );
  const data = await rejectTransportEnrollmentForActor(
    admin,
    actor,
    id,
    body.reason,
  );
  return c.json({ data });
});

transport.delete("/enrollments/:id/rejected", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteRejectedTransportEnrollmentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Portal helpers ───────────────────────────────────────────────

transport.get("/drivers/me", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await getDriverMeForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

transport.get("/portal/learner-transport", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      student_id: uuid,
    }),
    c.req.query(),
  );
  const data = await getLearnerTransportForActor(admin, actor, {
    instituteId: query.institute_id,
    studentId: query.student_id,
  });
  return c.json({ data });
});

transport.get("/portal/teacher-class-roster", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      class_label: z.string().min(1).optional(),
      section_label: z.string().min(1).optional(),
    }),
    c.req.query(),
  );
  const data = await listTeacherClassTransportForActor(admin, actor, {
    instituteId: query.institute_id,
    classLabel: query.class_label,
    sectionLabel: query.section_label,
  });
  return c.json({ data });
});

transport.get("/portal/learner-transport/live", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      student_id: uuid,
    }),
    c.req.query(),
  );
  const data = await getLearnerTransportLiveForActor(admin, actor, {
    instituteId: query.institute_id,
    studentId: query.student_id,
  });
  return c.json({ data });
});

// ── Trips & operations ───────────────────────────────────────────

const tripPhaseSchema = z.enum([
  "ready",
  "starting",
  "running",
  "boarding",
  "dropping",
  "completed",
]);
const tripSlotSchema = z.enum(["morning", "evening"]);
const boardingStatusSchema = z.enum(["pending", "boarded", "not_boarded"]);
const droppingStatusSchema = z.enum(["pending", "dropped", "not_dropped"]);
const emergencyStatusSchema = z.enum(["active", "acknowledged", "resolved"]);
const emergencyTypeSchema = z.enum([
  "general",
  "breakdown",
  "medical",
  "accident",
  "delay",
  "route_issue",
  "other",
]);

transport.get("/trips", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      trip_date: dateOnly,
    }),
    c.req.query(),
  );
  const data = await listTripsForActor(
    admin,
    actor,
    query.institute_id,
    query.trip_date ?? undefined,
  );
  return c.json({ data });
});

transport.get("/trips/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getTripForActor(admin, actor, id);
  return c.json({ data });
});

transport.get("/vehicles/:id/active-trip", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getActiveTripForVehicleForActor(admin, actor, id);
  return c.json({ data });
});

transport.get("/vehicles/:id/open-emergency", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getOpenEmergencyForVehicleForActor(admin, actor, id);
  return c.json({ data });
});

transport.post("/trips", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      route_id: uuid,
      vehicle_id: uuid,
      driver_id: uuid,
      slot: tripSlotSchema.optional(),
      trip_date: dateOnly,
    }),
    await c.req.json(),
  );
  const data = await startTripForActor(admin, actor, {
    instituteId: body.institute_id,
    routeId: body.route_id,
    vehicleId: body.vehicle_id,
    driverId: body.driver_id,
    slot: body.slot,
    tripDate: body.trip_date ?? undefined,
  });
  return c.json({ data }, 201);
});

transport.patch("/trips/:id/phase", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      phase: tripPhaseSchema,
      current_stop_id: uuid.nullable().optional(),
      current_stop_index: z.number().int().min(0).optional(),
    }),
    await c.req.json(),
  );
  const data = await updateTripPhaseForActor(admin, actor, id, {
    phase: body.phase,
    currentStopId: body.current_stop_id,
    currentStopIndex: body.current_stop_index,
  });
  return c.json({ data });
});

transport.post("/trips/:id/end", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await endTripForActor(admin, actor, id);
  return c.json({ data });
});

transport.get("/trips/:id/boarding", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await listBoardingForTripForActor(admin, actor, id);
  return c.json({ data });
});

transport.get("/boarding-marks", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      trip_date: dateOnly,
    }),
    c.req.query(),
  );
  const data = await listBoardingMarksForInstituteForActor(
    admin,
    actor,
    query.institute_id,
    query.trip_date ?? undefined,
  );
  return c.json({ data });
});

transport.post("/trips/:id/boarding", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      student_id: uuid,
      stop_id: uuid,
      boarding_status: boardingStatusSchema,
    }),
    await c.req.json(),
  );
  const data = await upsertBoardingForActor(admin, actor, id, {
    studentId: body.student_id,
    stopId: body.stop_id,
    boardingStatus: body.boarding_status,
  });
  return c.json({ data });
});

transport.post("/trips/:id/dropping", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      student_id: uuid,
      stop_id: uuid,
      dropping_status: droppingStatusSchema,
    }),
    await c.req.json(),
  );
  const data = await upsertDroppingForActor(admin, actor, id, {
    studentId: body.student_id,
    stopId: body.stop_id,
    droppingStatus: body.dropping_status,
  });
  return c.json({ data });
});

transport.get("/emergencies", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: emergencyStatusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listEmergenciesForActor(
    admin,
    actor,
    query.institute_id,
    query.status,
  );
  return c.json({ data });
});

transport.post("/emergencies", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      trip_id: uuid.nullable().optional(),
      driver_id: uuid,
      vehicle_id: uuid,
      emergency_type: emergencyTypeSchema.optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      note: z.string().max(2000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createEmergencyForActor(admin, actor, {
    instituteId: body.institute_id,
    tripId: body.trip_id,
    driverId: body.driver_id,
    vehicleId: body.vehicle_id,
    emergencyType: body.emergency_type,
    latitude: body.latitude,
    longitude: body.longitude,
    note: body.note,
  });
  return c.json({ data }, 201);
});

transport.post("/emergencies/:id/acknowledge", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await acknowledgeEmergencyForActor(admin, actor, id);
  return c.json({ data });
});

transport.post("/emergencies/:id/resolve", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({ resolve_note: z.string().max(2000).nullable().optional() }),
    await c.req.json().catch(() => ({})),
  );
  const data = await resolveEmergencyForActor(
    admin,
    actor,
    id,
    body.resolve_note,
  );
  return c.json({ data });
});

transport.post("/trips/:id/location", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy_m: z.number().nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await pingLocationForActor(admin, actor, {
    tripId: id,
    latitude: body.latitude,
    longitude: body.longitude,
    accuracyM: body.accuracy_m,
  });
  return c.json({ data }, 201);
});

export default transport;
