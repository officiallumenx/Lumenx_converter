import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

vi.stubGlobal("window", {
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

describe("connect transport shared projection", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("projects driver, route, stop pending, trip boarding, and sos", async () => {
    const ops = await import("./transport-ops-bridge");
    const att = await import("./transport-attendance-bridge");
    const em = await import("./transport-emergency");

    ops.seedTransportOps();

    const assigned = ops.projectConnectTransport("STU-1042");
    expect(assigned?.vehicleNumber).toBe("BUS-01");
    expect(assigned?.driverName).toBe("Rajesh Kumar");
    expect(assigned?.stopPending).toBe(false);
    expect(assigned?.routeCode).toBe("NCL");

    const pending = ops.projectConnectTransport("STU-1043");
    expect(pending?.stopPending).toBe(true);

    att.syncSharedTripMeta({
      tripId: "trip-connect-1",
      driverId: "drv-1042",
      driverName: "Rajesh Kumar",
      vehicleId: "VH-01",
      vehicleNumber: "BUS-01",
      routeId: "RT-01",
      routeCode: "NCL",
      routeName: "North Campus Loop",
      startedAt: new Date().toISOString(),
      completedAt: null,
      currentStopId: "RST-01",
      currentStopName: "North Campus Gate",
      phase: "boarding",
      finalized: false,
    });

    const trip = att.findTripMetaForVehicle("VH-01");
    expect(att.isSharedTripActive(trip)).toBe(true);

    const board = att.upsertBoardingMark({
      tripId: "trip-connect-1",
      driverId: "drv-1042",
      driverName: "Rajesh Kumar",
      vehicleId: "VH-01",
      vehicleNumber: "BUS-01",
      routeId: "RT-01",
      routeCode: "NCL",
      routeName: "North Campus Loop",
      currentStopId: "RST-01",
      currentStopName: "North Campus Gate",
      studentStopId: "RST-01",
      studentStopName: "North Campus Gate",
      studentId: "STU-1042",
      studentName: "Aarav Sharma",
      studentClass: "10-B",
      boarding: "boarded",
    });
    expect(board.ok).toBe(true);
    expect(att.projectConnectAttendanceForStudent("STU-1042")?.boarding).toBe("boarded");

    const sos = em.createTransportEmergency({
      driverId: "DRV-1042",
      driverName: "Rajesh Kumar",
      vehicleId: "VH-01",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      routeName: "North Campus Loop",
    });
    expect(sos.ok).toBe(true);
    expect(em.findOpenEmergencyForVehicle("VH-01")?.status).toBe("active");
  });
});
