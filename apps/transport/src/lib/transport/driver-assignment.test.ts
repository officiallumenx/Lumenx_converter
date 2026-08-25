import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

describe("phase1 driver assignment", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("resolves Rajesh → BUS-01 / RT-01 and Suresh → BUS-02 / RT-02", async () => {
    const { resolveDriverAssignment, listDemoDriverHints } = await import(
      "./driver-assignment"
    );

    const rajesh = resolveDriverAssignment("9876543210");
    expect(rajesh.status).toBe("ready");
    expect(rajesh.driver?.name).toMatch(/Rajesh/i);
    expect(rajesh.bus?.busNumber).toBe("BUS-01");
    expect(rajesh.bus?.vehicleId).toBe("VH-01");
    expect(rajesh.route?.adminRouteId).toBe("RT-01");
    expect(rajesh.studentCount).toBeGreaterThan(0);

    const suresh = resolveDriverAssignment("9876543211");
    expect(suresh.status).toBe("ready");
    expect(suresh.driver?.name).toMatch(/Suresh/i);
    expect(suresh.bus?.busNumber).toBe("BUS-02");
    expect(suresh.bus?.vehicleId).toBe("VH-02");
    expect(suresh.route?.adminRouteId).toBe("RT-02");
    expect(suresh.studentCount).toBeGreaterThan(0);

    // Distinct rosters
    expect(rajesh.studentCount).not.toBe(suresh.studentCount);

    const hints = listDemoDriverHints();
    expect(hints.map((h) => h.phoneDigits).sort()).toEqual(["9876543210", "9876543211"]);
  });

  it("returns no_bus when vehicle is missing", async () => {
    const utils = await import("@lumenx/utils");
    const ops = utils.loadTransportOps();
    ops.driverAccounts = [
      {
        id: "drv-x",
        adminDriverId: "DR-X",
        employeeId: "DRV-X",
        phoneDigits: "9999999999",
        name: "No Bus Driver",
        licenseNumber: "DL-X",
        vehicleId: null,
        vehicleNumber: null,
        adminRouteId: null,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    utils.saveTransportOps(ops);

    const { resolveDriverAssignment } = await import("./driver-assignment");
    const result = resolveDriverAssignment("9999999999");
    expect(result.status).toBe("no_bus");
  });
});
