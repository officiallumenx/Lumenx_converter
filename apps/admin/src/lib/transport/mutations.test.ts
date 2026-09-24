import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VEHICLE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DRIVER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("transport mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not call network for invalid UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteVehicle } = await import("./mutations");
    await expect(deleteVehicle("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts vehicle with assigned_driver_id and puts settings fields in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const put = vi.fn().mockResolvedValue({ instituteId: INST });
    const client = { post, put } as never;
    const { createVehicle, upsertTransportSettings } = await import("./mutations");
    await createVehicle(
      {
        instituteId: INST,
        vehicleNumber: "BUS-1",
        registrationNumber: "TS09AB1234",
        capacity: 40,
        assignedDriverId: DRIVER,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/transport/vehicles",
      expect.objectContaining({
        institute_id: INST,
        vehicle_number: "BUS-1",
        assigned_driver_id: DRIVER,
      }),
    );
    await upsertTransportSettings(
      {
        instituteId: INST,
        defaultNotificationRadiusM: 120,
        workingDays: [1, 2, 3],
        notificationsEnabled: false,
        rememberEnabled: true,
        defaultPickupTime: "07:30",
      },
      client,
    );
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/transport/settings?"),
      expect.objectContaining({
        default_notification_radius_m: 120,
        working_days: [1, 2, 3],
        notifications_enabled: false,
        remember_enabled: true,
        default_pickup_time: "07:30",
      }),
    );
  });

  it("posts driver with app_account_pin and assigned_vehicle_id", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createDriver } = await import("./mutations");
    await createDriver(
      {
        instituteId: INST,
        displayName: "Ravi",
        phone: "9876543210",
        licenseNumber: "DL-1",
        appAccountPin: "123456",
        assignedVehicleId: VEHICLE,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/transport/drivers",
      expect.objectContaining({
        institute_id: INST,
        display_name: "Ravi",
        app_account_pin: "123456",
        assigned_vehicle_id: VEHICLE,
      }),
    );
  });

  it("posts enrollment with nullable stops", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createEnrollment } = await import("./mutations");
    const studentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const routeId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    await createEnrollment(
      {
        instituteId: INST,
        studentId,
        routeId,
        pickupStopId: null,
        dropStopId: null,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/transport/enrollments",
      expect.objectContaining({
        institute_id: INST,
        student_id: studentId,
        route_id: routeId,
        pickup_stop_id: null,
        drop_stop_id: null,
      }),
    );
  });
});
