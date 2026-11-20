import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  findDriverByUserProfileId: vi.fn(),
  findEnrollmentById: vi.fn(),
  findRouteById: vi.fn(),
  findStopById: vi.fn(),
  listEnrollmentsForRoute: vi.fn(async () => []),
  updateEnrollmentFields: vi.fn(async (_a, id, patch) => ({
    id,
    ...patch,
  })),
}));

vi.mock("./ops-repository.js", () => ({
  findActiveTripForVehicle: vi.fn(),
}));

vi.mock("./trip-participant-repository.js", () => ({
  insertEnrollmentLocationChange: vi.fn(async (row) => ({
    id: "chg-1",
    institute_id: row.instituteId,
    enrollment_id: row.enrollmentId,
    student_id: row.studentId,
    route_id: row.routeId,
    previous_pickup_stop_id: row.previousPickupStopId,
    previous_drop_stop_id: row.previousDropStopId,
    new_stop_id: row.newStopId,
    changed_by_driver_id: row.changedByDriverId,
    changed_by_user_id: row.changedByUserId,
    effective_mode: row.effectiveMode,
    created_at: new Date().toISOString(),
  })),
  insertTripParticipants: vi.fn(async (_admin, rows) => rows),
  listTripParticipants: vi.fn(async () => []),
  listEnrollmentLocationChanges: vi.fn(async () => []),
}));

vi.mock("./daily-exception-repository.js", () => ({
  listActiveDailyExceptionsForStudents: vi.fn(async () => []),
}));

vi.mock("./approval.js", () => ({
  isDriverForInstitute: vi.fn(() => true),
  isTransportWriter: vi.fn(() => false),
}));

vi.mock("../../authorization/index.js", () => ({
  requireInstituteId: (_actor: unknown, id: string) => id,
}));

import { findActiveTripForVehicle } from "./ops-repository.js";
import {
  findDriverByUserProfileId,
  findEnrollmentById,
  findRouteById,
  findStopById,
  listEnrollmentsForRoute,
  updateEnrollmentFields,
} from "./repository.js";
import {
  insertEnrollmentLocationChange,
  insertTripParticipants,
  listTripParticipants,
} from "./trip-participant-repository.js";
import {
  promotePendingEnrollmentStopsForRoute,
  reassignCommonLocationForActor,
  routeHasActiveTrip,
  snapshotTripParticipants,
} from "./location-assignment.js";

const INST = "11111111-1111-4111-8111-111111111111";
const ROUTE = "22222222-2222-4222-8222-222222222222";
const STOP_A = "33333333-3333-4333-8333-333333333333";
const STOP_B = "44444444-4444-4444-8444-444444444444";
const ENROLL = "55555555-5555-4555-8555-555555555555";
const STUDENT = "66666666-6666-4666-8666-666666666666";
const DRIVER = "77777777-7777-4777-8777-777777777777";
const VEHICLE = "88888888-8888-4888-8888-888888888888";

describe("reassignCommonLocationForActor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findDriverByUserProfileId).mockResolvedValue({
      id: DRIVER,
      institute_id: INST,
    } as never);
    vi.mocked(findStopById).mockResolvedValue({
      id: STOP_B,
      institute_id: INST,
      route_id: ROUTE,
      deleted_at: null,
    } as never);
    vi.mocked(findEnrollmentById).mockResolvedValue({
      id: ENROLL,
      institute_id: INST,
      student_id: STUDENT,
      route_id: ROUTE,
      pickup_stop_id: STOP_A,
      drop_stop_id: STOP_A,
      deleted_at: null,
    } as never);
    vi.mocked(findRouteById).mockResolvedValue({
      id: ROUTE,
      driver_id: DRIVER,
      vehicle_id: VEHICLE,
    } as never);
  });

  it("writes live pickup+drop immediately when no active trip", async () => {
    vi.mocked(findActiveTripForVehicle).mockResolvedValue(null);
    const result = await reassignCommonLocationForActor(
      {} as never,
      { userId: "u1" } as never,
      {
        instituteId: INST,
        enrollmentIds: [ENROLL],
        newStopId: STOP_B,
      },
    );
    expect(result.effectiveMode).toBe("immediate");
    expect(result.updatedCount).toBe(1);
    expect(updateEnrollmentFields).toHaveBeenCalledWith(
      expect.anything(),
      ENROLL,
      expect.objectContaining({
        pickup_stop_id: STOP_B,
        drop_stop_id: STOP_B,
        next_pickup_stop_id: null,
        next_drop_stop_id: null,
      }),
    );
    expect(insertEnrollmentLocationChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        effectiveMode: "immediate",
        newStopId: STOP_B,
        previousPickupStopId: STOP_A,
      }),
    );
  });

  it("queues next_* when an active trip exists", async () => {
    vi.mocked(findActiveTripForVehicle).mockResolvedValue({
      id: "trip-1",
      phase: "running",
      finalized: false,
    } as never);
    const result = await reassignCommonLocationForActor(
      {} as never,
      { userId: "u1" } as never,
      {
        instituteId: INST,
        enrollmentIds: [ENROLL],
        newStopId: STOP_B,
      },
    );
    expect(result.effectiveMode).toBe("next_trip");
    expect(updateEnrollmentFields).toHaveBeenCalledWith(
      expect.anything(),
      ENROLL,
      expect.objectContaining({
        next_pickup_stop_id: STOP_B,
        next_drop_stop_id: STOP_B,
      }),
    );
    expect(updateEnrollmentFields).not.toHaveBeenCalledWith(
      expect.anything(),
      ENROLL,
      expect.objectContaining({ pickup_stop_id: STOP_B }),
    );
  });

  it("rejects cross-route stop assignment", async () => {
    vi.mocked(findActiveTripForVehicle).mockResolvedValue(null);
    vi.mocked(findStopById).mockResolvedValue({
      id: STOP_B,
      institute_id: INST,
      route_id: "99999999-9999-4999-8999-999999999999",
      deleted_at: null,
    } as never);
    await expect(
      reassignCommonLocationForActor({} as never, { userId: "u1" } as never, {
        instituteId: INST,
        enrollmentIds: [ENROLL],
        newStopId: STOP_B,
      }),
    ).rejects.toThrow(/route/i);
  });

  it("rejects another driver's enrollment", async () => {
    vi.mocked(findActiveTripForVehicle).mockResolvedValue(null);
    vi.mocked(findRouteById).mockResolvedValue({
      id: ROUTE,
      driver_id: "other-driver",
      vehicle_id: VEHICLE,
    } as never);
    await expect(
      reassignCommonLocationForActor({} as never, { userId: "u1" } as never, {
        instituteId: INST,
        enrollmentIds: [ENROLL],
        newStopId: STOP_B,
      }),
    ).rejects.toThrow(/assigned route/i);
  });
});

describe("routeHasActiveTrip", () => {
  it("is false without vehicle or active trip", async () => {
    expect(await routeHasActiveTrip({} as never, { vehicle_id: null })).toBe(
      false,
    );
    vi.mocked(findActiveTripForVehicle).mockResolvedValue(null);
    expect(
      await routeHasActiveTrip({} as never, { vehicle_id: VEHICLE }),
    ).toBe(false);
  });
});

describe("promotePendingEnrollmentStopsForRoute", () => {
  it("promotes next_* onto live pickup/drop and clears deferred fields", async () => {
    vi.mocked(listEnrollmentsForRoute).mockResolvedValue([
      {
        id: ENROLL,
        institute_id: INST,
        student_id: STUDENT,
        route_id: ROUTE,
        pickup_stop_id: STOP_A,
        drop_stop_id: STOP_A,
        next_pickup_stop_id: STOP_B,
        next_drop_stop_id: STOP_B,
        next_stops_pending_at: new Date().toISOString(),
        status: "active",
        approval_status: "approved",
      },
    ] as never);
    const n = await promotePendingEnrollmentStopsForRoute(
      {} as never,
      INST,
      ROUTE,
    );
    expect(n).toBe(1);
    expect(updateEnrollmentFields).toHaveBeenCalledWith(
      expect.anything(),
      ENROLL,
      expect.objectContaining({
        pickup_stop_id: STOP_B,
        drop_stop_id: STOP_B,
        next_pickup_stop_id: null,
        next_drop_stop_id: null,
      }),
    );
  });
});

describe("snapshotTripParticipants", () => {
  it("freezes usable enrollments and skips when snapshot already exists", async () => {
    vi.mocked(listTripParticipants).mockResolvedValueOnce([
      { id: "p1", student_id: STUDENT },
    ] as never);
    const existing = await snapshotTripParticipants({} as never, {
      id: "trip-1",
      institute_id: INST,
      route_id: ROUTE,
      trip_date: "2026-11-01",
    } as never);
    expect(existing).toBe(1);
    expect(insertTripParticipants).not.toHaveBeenCalled();

    vi.mocked(listTripParticipants).mockResolvedValueOnce([]);
    vi.mocked(listEnrollmentsForRoute).mockResolvedValue([
      {
        id: ENROLL,
        institute_id: INST,
        student_id: STUDENT,
        route_id: ROUTE,
        pickup_stop_id: STOP_A,
        drop_stop_id: STOP_A,
        status: "active",
        approval_status: "pending",
      },
      {
        id: "enroll-rej",
        institute_id: INST,
        student_id: "student-rej",
        route_id: ROUTE,
        pickup_stop_id: STOP_A,
        drop_stop_id: STOP_A,
        status: "active",
        approval_status: "rejected",
      },
    ] as never);
    const n = await snapshotTripParticipants({} as never, {
      id: "trip-2",
      institute_id: INST,
      route_id: ROUTE,
      trip_date: "2026-11-01",
    } as never);
    expect(n).toBe(1);
    expect(insertTripParticipants).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          enrollmentId: ENROLL,
          pickupStopId: STOP_A,
          dropStopId: STOP_A,
        }),
      ]),
    );
  });
});
