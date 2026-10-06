import { describe, expect, it } from "vitest";
import {
  assertDriverOwnsRoute,
  assertDriverOwnsTrip,
  assertDriverOwnsVehicle,
  isDriverOnlyActor,
  isElevatedTransportReader,
} from "./access.js";
import type { Actor } from "../../auth/types.js";
import type { DriverRow, RouteRow } from "./types.js";
import type { TransportTripRow } from "./ops-types.js";
import { AppError } from "../../errors/app-error.js";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function actor(roles: string[]): Actor {
  return {
    userId: "66666666-6666-4666-8666-666666666666",
    email: "d@x.com",
    isPlatformOperator: false,
    memberships: [
      {
        membershipId: "m1",
        instituteId: INST,
        roles,
        status: "active",
      },
    ],
    students: [],
    parents: [],
  };
}

describe("transport access helpers (phase9)", () => {
  it("elevated readers exclude pure drivers", () => {
    expect(isElevatedTransportReader(actor(["institute_admin"]), INST)).toBe(true);
    expect(isElevatedTransportReader(actor(["teacher"]), INST)).toBe(true);
    expect(isElevatedTransportReader(actor(["driver"]), INST)).toBe(false);
    expect(isDriverOnlyActor(actor(["driver"]), INST)).toBe(true);
    expect(isDriverOnlyActor(actor(["institute_admin", "driver"]), INST)).toBe(
      false,
    );
  });

  it("driver vehicle/route/trip ownership checks", () => {
    const driver = {
      id: "d1",
      institute_id: INST,
      user_profile_id: "u1",
      assigned_vehicle_id: "v1",
      deleted_at: null,
    } as DriverRow;

    expect(() => assertDriverOwnsVehicle(driver, "v1")).not.toThrow();
    expect(() => assertDriverOwnsVehicle(driver, "v2")).toThrow(AppError);

    const route = {
      id: "r1",
      institute_id: INST,
      driver_id: "d1",
      deleted_at: null,
      approval_status: "approved",
      submitted_by_user_id: null,
    } as RouteRow;
    expect(() => assertDriverOwnsRoute(driver, route)).not.toThrow();
    expect(() =>
      assertDriverOwnsRoute(driver, { ...route, driver_id: "other" } as RouteRow),
    ).toThrow(AppError);

    const trip = {
      id: "t1",
      driver_id: "d1",
      institute_id: INST,
    } as TransportTripRow;
    expect(() => assertDriverOwnsTrip(driver, trip)).not.toThrow();
    expect(() =>
      assertDriverOwnsTrip(driver, { ...trip, driver_id: "other" }),
    ).toThrow(AppError);
  });
});
