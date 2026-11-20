import { beforeEach, describe, expect, it, vi } from "vitest";

const emitTransportNotification = vi.fn();
const emitTransportNotificationSafe = vi.fn();
const listLinksForStudentIds = vi.fn();
const findStudentById = vi.fn();
const listEnrollmentsForRoute = vi.fn();
const findDriverById = vi.fn();
const findVehicleById = vi.fn();
const findStopById = vi.fn();

vi.mock("./transport-notification-emit.js", () => ({
  emitTransportNotification: (...args: unknown[]) =>
    emitTransportNotification(...args),
  emitTransportNotificationSafe: (...args: unknown[]) =>
    emitTransportNotificationSafe(...args),
}));

vi.mock("../parents/repository.js", () => ({
  listLinksForStudentIds: (...args: unknown[]) => listLinksForStudentIds(...args),
}));

vi.mock("../students/repository.js", () => ({
  findStudentById: (...args: unknown[]) => findStudentById(...args),
}));

vi.mock("./repository.js", () => ({
  listEnrollmentsForRoute: (...args: unknown[]) => listEnrollmentsForRoute(...args),
  findDriverById: (...args: unknown[]) => findDriverById(...args),
  findVehicleById: (...args: unknown[]) => findVehicleById(...args),
  findStopById: (...args: unknown[]) => findStopById(...args),
}));

import {
  notifyBoardingMarked,
  notifyDroppingMarked,
  notifySchoolArrived,
  notifyTripEnded,
  notifyTripStarted,
} from "./ops-notifications.js";
import type { TransportTripRow } from "./ops-types.js";

const trip = {
  id: "trip-1",
  institute_id: "inst-1",
  route_id: "route-1",
  vehicle_id: "veh-1",
  driver_id: "drv-1",
  slot: "morning",
  phase: "running",
} as TransportTripRow;

describe("ops-notifications student audience + step 34", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emitTransportNotification.mockResolvedValue({ ok: true });
    listEnrollmentsForRoute.mockResolvedValue([
      { student_id: "stu-1", approval_status: "approved" },
    ]);
    listLinksForStudentIds.mockResolvedValue([
      { student_id: "stu-1", parent_id: "par-1" },
    ]);
    findDriverById.mockResolvedValue({ user_profile_id: "drv-user" });
    findVehicleById.mockResolvedValue({ vehicle_number: "E2E-BUS-01" });
    findStopById.mockResolvedValue({ name: "Gate" });
    findStudentById.mockResolvedValue({
      id: "stu-1",
      institute_id: "inst-1",
      deleted_at: null,
      user_profile_id: "stu-user",
      display_name: "E2E Rider",
      first_name: "E2E",
      surname: "Rider",
    });
  });

  it("notifyTripStarted emits a separate student Connect audience", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "parent") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ id: "par-1", user_profile_id: "par-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        if (table === "student") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ id: "stu-1", user_profile_id: "stu-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        if (table === "membership") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as never;

    await notifyTripStarted(admin, trip, "actor-1");
    const audiences = emitTransportNotificationSafe.mock.calls.map(
      (c) => (c[1] as { targetAudience: string }).targetAudience,
    );
    expect(audiences).toContain("parent");
    expect(audiences).toContain("student");
    expect(audiences).toContain("driver");
    const studentCall = emitTransportNotificationSafe.mock.calls.find(
      (c) => (c[1] as { targetAudience: string }).targetAudience === "student",
    );
    expect(studentCall?.[1]).toMatchObject({
      title: "Bus is started",
      recipientUserIds: ["stu-user"],
    });
  });

  it("notifySchoolArrived includes student copy", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "parent") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ id: "par-1", user_profile_id: "par-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        if (table === "student") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ id: "stu-1", user_profile_id: "stu-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        if (table === "membership") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as never;

    await notifySchoolArrived(admin, trip, "actor-1");
    const studentCall = emitTransportNotificationSafe.mock.calls.find(
      (c) => (c[1] as { targetAudience: string }).targetAudience === "student",
    );
    expect(studentCall?.[1]).toMatchObject({
      title: "Bus reached school",
      recipientUserIds: ["stu-user"],
    });
  });

  it("notifyBoardingMarked emits student picked-up copy", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "parent") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ user_profile_id: "par-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as never;

    await notifyBoardingMarked(admin, {
      trip,
      studentId: "stu-1",
      boardingStatus: "boarded",
      createdByUserId: "actor-1",
    });

    expect(emitTransportNotification).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ targetAudience: "parent" }),
    );
    expect(emitTransportNotificationSafe).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        targetAudience: "student",
        title: "You marked as picked up",
        recipientUserIds: ["stu-user"],
      }),
    );
  });

  it("notifyDroppingMarked emits student dropped copy", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "parent") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ user_profile_id: "par-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as never;

    await notifyDroppingMarked(admin, {
      trip,
      studentId: "stu-1",
      stopId: "stop-1",
      droppingStatus: "dropped",
      createdByUserId: "actor-1",
    });

    expect(emitTransportNotificationSafe).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        targetAudience: "student",
        title: "You marked as dropped",
        recipientUserIds: ["stu-user"],
      }),
    );
  });

  it("notifyTripEnded evening is admin-only with bus dropped-all copy", async () => {
    const eveningTrip = { ...trip, slot: "evening" } as TransportTripRow;
    const admin = {
      from: (table: string) => {
        if (table === "membership") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () =>
                    Promise.resolve({
                      data: [{ id: "mem-1", user_id: "admin-user" }],
                    }),
                }),
              }),
            }),
          };
        }
        if (table === "membership_role") {
          return {
            select: () => ({
              in: () => ({
                in: () =>
                  Promise.resolve({
                    data: [{ membership_id: "mem-1", role_code: "institute_admin" }],
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as never;

    await notifyTripEnded(admin, eveningTrip, "actor-1");
    expect(emitTransportNotificationSafe).toHaveBeenCalledTimes(1);
    expect(emitTransportNotificationSafe).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        targetAudience: "admin",
        title: "E2E-BUS-01 successfully dropped all students",
        body: "E2E-BUS-01 successfully dropped all students.",
        recipientUserIds: ["admin-user"],
      }),
    );
  });
});
