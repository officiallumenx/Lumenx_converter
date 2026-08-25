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

const baseBoard = {
  tripId: "trip-1",
  driverId: "DRV-01",
  driverName: "Rajesh",
  vehicleId: "VH-01",
  vehicleNumber: "BUS-01",
  routeId: "RT-01",
  routeCode: "NCL",
  routeName: "North",
  currentStopId: "S1",
  currentStopName: "Gate A",
  studentStopId: "S1",
  studentStopName: "Gate A",
  studentId: "STU-1",
  studentName: "Asha",
  studentClass: "5A",
};

describe("transport attendance bridge rules", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("boards, rejects duplicate, undoes with confirm, drops, rejects drop before board", async () => {
    const bridge = await import("./transport-attendance-bridge");

    const boarded = bridge.upsertBoardingMark({ ...baseBoard, boarding: "boarded" });
    expect(boarded.ok).toBe(true);
    if (boarded.ok) {
      expect(boarded.mark.boarding).toBe("boarded");
      expect(boarded.mark.boardedAt).toBeTruthy();
    }

    const dup = bridge.upsertBoardingMark({ ...baseBoard, boarding: "boarded" });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.code).toBe("duplicate_boarding");

    const undoBlocked = bridge.upsertBoardingMark({ ...baseBoard, boarding: "pending" });
    expect(undoBlocked.ok).toBe(false);

    const undo = bridge.upsertBoardingMark({
      ...baseBoard,
      boarding: "pending",
      confirmChange: true,
    });
    expect(undo.ok).toBe(true);

    const dropEarly = bridge.upsertDroppingMark({
      tripId: "trip-1",
      driverId: "DRV-01",
      driverName: "Rajesh",
      vehicleId: "VH-01",
      vehicleNumber: "BUS-01",
      routeId: "RT-01",
      routeCode: "NCL",
      routeName: "North",
      stopId: "DEST",
      stopName: "School",
      studentId: "STU-1",
      studentName: "Asha",
      studentClass: "5A",
      dropping: "dropped",
    });
    expect(dropEarly.ok).toBe(false);
    if (!dropEarly.ok) expect(dropEarly.code).toBe("drop_before_board");

    bridge.upsertBoardingMark({ ...baseBoard, boarding: "boarded" });
    const dropped = bridge.upsertDroppingMark({
      tripId: "trip-1",
      driverId: "DRV-01",
      driverName: "Rajesh",
      vehicleId: "VH-01",
      vehicleNumber: "BUS-01",
      routeId: "RT-01",
      routeCode: "NCL",
      routeName: "North",
      stopId: "DEST",
      stopName: "School",
      studentId: "STU-1",
      studentName: "Asha",
      studentClass: "5A",
      dropping: "dropped",
    });
    expect(dropped.ok).toBe(true);
    if (dropped.ok) expect(dropped.mark.droppedAt).toBeTruthy();

    const dupDrop = bridge.upsertDroppingMark({
      tripId: "trip-1",
      driverId: "DRV-01",
      driverName: "Rajesh",
      vehicleId: "VH-01",
      vehicleNumber: "BUS-01",
      routeId: "RT-01",
      routeCode: "NCL",
      routeName: "North",
      stopId: "DEST",
      stopName: "School",
      studentId: "STU-1",
      studentName: "Asha",
      studentClass: "5A",
      dropping: "dropped",
    });
    expect(dupDrop.ok).toBe(false);
    if (!dupDrop.ok) expect(dupDrop.code).toBe("duplicate_dropping");
  });

  it("rejects boarding at the wrong stop", async () => {
    const bridge = await import("./transport-attendance-bridge");
    const result = bridge.upsertBoardingMark({
      ...baseBoard,
      currentStopId: "S2",
      currentStopName: "Gate B",
      boarding: "boarded",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_stop");
  });

  it("finalizes trip and requires confirm to change", async () => {
    const bridge = await import("./transport-attendance-bridge");
    bridge.upsertBoardingMark({ ...baseBoard, boarding: "boarded" });
    bridge.finalizeTripAttendance("trip-1");
    const change = bridge.upsertBoardingMark({ ...baseBoard, boarding: "pending" });
    expect(change.ok).toBe(false);
    if (!change.ok) expect(change.code).toBe("finalized");
    const ok = bridge.upsertBoardingMark({
      ...baseBoard,
      boarding: "pending",
      confirmChange: true,
    });
    expect(ok.ok).toBe(true);
  });
});
