import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("transport mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createVehicle } = await import("./mutations");
    await expect(
      createVehicle({
        instituteId: INST,
        vehicleNumber: "BUS-1",
        registrationNumber: "TS09AB1234",
        capacity: 40,
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteVehicle } = await import("./mutations");
    await expect(deleteVehicle("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts vehicle and puts settings in API mode", async () => {
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
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/transport/vehicles",
      expect.objectContaining({
        institute_id: INST,
        vehicle_number: "BUS-1",
      }),
    );
    await upsertTransportSettings(
      { instituteId: INST, defaultNotificationRadiusM: 120, workingDays: [1, 2, 3] },
      client,
    );
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/transport/settings?"),
      expect.objectContaining({
        default_notification_radius_m: 120,
        working_days: [1, 2, 3],
      }),
    );
  });
});
