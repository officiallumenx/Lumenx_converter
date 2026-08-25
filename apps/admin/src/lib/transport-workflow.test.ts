import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PendingRouteStop,
  PendingStudentAssignment,
} from "./transport-approval-store";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

const dispatched: string[] = [];
vi.stubGlobal("window", {
  ...globalThis.window,
  dispatchEvent: (e: Event) => {
    dispatched.push(e.type);
    return true;
  },
  addEventListener: vi.fn(),
  CustomEvent: globalThis.CustomEvent ?? class CE extends Event {
    detail: unknown;
    constructor(type: string, opts?: { detail?: unknown }) {
      super(type);
      this.detail = opts?.detail;
    }
  },
});

vi.mock("@lumenx/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/types")>();
  return { ...actual, readDemoProfileId: () => "multi_institute" as const };
});

vi.mock("@lumenx/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/utils")>();
  return {
    ...actual,
    syncDriverStopAssignment: vi.fn(),
    recordLocalChangeForSync: vi.fn(),
    loadTransportOps: () => ({
      enrollments: [],
      driverStopsByRoute: {},
      routeLocksByRoute: {},
      driverAccounts: [],
    }),
    enrollmentsForVehicle: () => [],
    findDriverAccountByAdminDriverId: () => null,
    syncRouteLockFromAdmin: vi.fn(),
  };
});

const STORAGE_KEY = "lumenx.transport.route-setup.v1";

type RouteSetupRecord = {
  routeId: string;
  routeCode: string;
  routeName: string;
  status: string;
  lockedByAdmin: boolean;
  targetStopCount: number;
  stops: PendingRouteStop[];
  assignments: PendingStudentAssignment[];
  setupStartedAt: string | null;
  setupFinishedAt: string | null;
  setupInProgress: boolean;
};

function loadRecord(): RouteSetupRecord {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw
    ? (JSON.parse(raw) as RouteSetupRecord)
    : {
        routeId: "RT-01",
        routeCode: "NCL",
        routeName: "North Campus Loop",
        status: "not_configured",
        lockedByAdmin: false,
        targetStopCount: 4,
        stops: [],
        assignments: [],
        setupStartedAt: null,
        setupFinishedAt: null,
        setupInProgress: false,
      };
}

function saveRecord(r: RouteSetupRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

function driverCreateStop(
  input: Omit<PendingRouteStop, "status" | "updatedAt" | "timestampCreated" | "routeOrder">,
): PendingRouteStop {
  const record = loadRecord();
  const stop: PendingRouteStop = {
    ...input,
    status: "pending",
    timestampCreated: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    routeOrder: record.stops.length + 1,
  };
  record.stops.push(stop);
  record.setupInProgress = true;
  saveRecord(record);
  return stop;
}

function driverAssignStudent(
  input: Omit<PendingStudentAssignment, "status" | "createdAt" | "updatedAt">,
): PendingStudentAssignment {
  const record = loadRecord();
  const assignment: PendingStudentAssignment = {
    ...input,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  record.assignments.push(assignment);
  saveRecord(record);
  return assignment;
}

function driverEditStop(stopId: string, patch: Partial<PendingRouteStop>) {
  const record = loadRecord();
  record.stops = record.stops.map((s) =>
    s.id === stopId ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
  );
  saveRecord(record);
}

function driverRemoveAssignment(assignmentId: string) {
  const record = loadRecord();
  record.assignments = record.assignments.filter((a) => a.id !== assignmentId);
  saveRecord(record);
}

function driverCreateChangeRequest(
  approvedStopId: string,
  newStop: Omit<PendingRouteStop, "status" | "updatedAt" | "timestampCreated" | "routeOrder" | "replacesStopId">,
): PendingRouteStop {
  const record = loadRecord();
  const original = record.stops.find((s) => s.id === approvedStopId);
  const stop: PendingRouteStop = {
    ...newStop,
    status: "pending",
    timestampCreated: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    routeOrder: original?.routeOrder ?? record.stops.length + 1,
    replacesStopId: approvedStopId,
  };
  record.stops.push(stop);
  saveRecord(record);
  return stop;
}

describe("Transport Admin ↔ Driver full workflow", () => {
  let approvalStore: typeof import("./transport-approval-store");

  beforeEach(async () => {
    store.clear();
    dispatched.length = 0;
    vi.resetModules();
    approvalStore = await import("./transport-approval-store");
  });

  it("full lifecycle: create → approve/reject → verify → edit → change request → bulk", async () => {
    // ── 1. Driver creates multiple stops ──
    const stop1 = driverCreateStop({
      id: "S1", name: "Green Park", locationLabel: "Green Park Metro",
      latitude: 28.55, longitude: 77.20, createdBy: "drv-1042", studentIds: [],
    });
    const stop2 = driverCreateStop({
      id: "S2", name: "Central Library", locationLabel: "Central Library Circle",
      latitude: 28.61, longitude: 77.21, createdBy: "drv-1042", studentIds: [],
    });
    const stop3 = driverCreateStop({
      id: "S3", name: "East Gate", locationLabel: "East Gate Circle",
      latitude: 28.62, longitude: 77.24, createdBy: "drv-1042", studentIds: [],
    });
    const stop4 = driverCreateStop({
      id: "S4", name: "West Wing", locationLabel: "West Wing Road",
      latitude: 28.50, longitude: 77.18, createdBy: "drv-1042", studentIds: [],
    });

    // ── 14. Multiple stops created ──
    expect(approvalStore.loadAllStops()).toHaveLength(4);

    // ── 2. Driver assigns students (pending) ──
    const asgn1 = driverAssignStudent({
      id: "A1", studentId: "STU-1042", studentName: "Aarav Sharma",
      studentClass: "10-B", stopId: "S1", stopName: "Green Park",
    });
    const asgn2 = driverAssignStudent({
      id: "A2", studentId: "STU-1043", studentName: "Noah Draxler",
      studentClass: "10-A", stopId: "S1", stopName: "Green Park",
    });
    const asgn3 = driverAssignStudent({
      id: "A3", studentId: "STU-1044", studentName: "Anaya Sharma",
      studentClass: "10-B", stopId: "S2", stopName: "Central Library",
    });
    const asgn4 = driverAssignStudent({
      id: "A4", studentId: "STU-1045", studentName: "Sana Khan",
      studentClass: "12-A", stopId: "S3", stopName: "East Gate",
    });
    const asgn5 = driverAssignStudent({
      id: "A5", studentId: "STU-1046", studentName: "Liam Chen",
      studentClass: "11-B", stopId: "S2", stopName: "Central Library",
    });

    // ── 13. Multiple students assigned ──
    expect(approvalStore.loadAllAssignments()).toHaveLength(5);
    // ── 13. Two students on S1 ──
    expect(approvalStore.loadAllAssignments().filter((a) => a.stopId === "S1")).toHaveLength(2);

    // All are pending at this point
    expect(approvalStore.loadPendingStops()).toHaveLength(4);
    expect(approvalStore.loadPendingAssignments()).toHaveLength(5);

    // ── 3. Admin approves some stops, leaves some pending, rejects one ──
    // Approving a stop also activates its pending student assignments.
    approvalStore.approveStop("S1");
    approvalStore.approveStop("S2");
    approvalStore.rejectStop("S4");
    // S3 left pending

    // ── 5. Driver verifies each status ──
    const allStops = approvalStore.loadAllStops();
    expect(allStops.find((s) => s.id === "S1")!.status).toBe("approved");
    expect(allStops.find((s) => s.id === "S2")!.status).toBe("approved");
    expect(allStops.find((s) => s.id === "S3")!.status).toBe("pending");
    expect(allStops.find((s) => s.id === "S4")!.status).toBe("rejected");

    // Assignments on approved stops are active; S3 assignment stays pending
    const afterStopDecision = approvalStore.loadAllAssignments();
    expect(afterStopDecision.find((a) => a.id === "A1")!.status).toBe("approved");
    expect(afterStopDecision.find((a) => a.id === "A2")!.status).toBe("approved");
    expect(afterStopDecision.find((a) => a.id === "A3")!.status).toBe("approved");
    expect(afterStopDecision.find((a) => a.id === "A4")!.status).toBe("pending");
    expect(afterStopDecision.find((a) => a.id === "A5")!.status).toBe("approved");

    // ── 4. Admin can still decline an active assignment independently ──
    approvalStore.rejectAssignment("A5");

    const allAsgn = approvalStore.loadAllAssignments();
    expect(allAsgn.find((a) => a.id === "A1")!.status).toBe("approved");
    expect(allAsgn.find((a) => a.id === "A2")!.status).toBe("approved");
    expect(allAsgn.find((a) => a.id === "A3")!.status).toBe("approved");
    expect(allAsgn.find((a) => a.id === "A4")!.status).toBe("pending");
    expect(allAsgn.find((a) => a.id === "A5")!.status).toBe("rejected");

    // ── 6. Admin bus detail shows correct approved/pending/total counts ──
    const stopsAfter = approvalStore.loadAllStops();
    const approvedStops = stopsAfter.filter((s) => s.status === "approved");
    const pendingStops = stopsAfter.filter((s) => s.status === "pending");
    const rejectedStops = stopsAfter.filter((s) => s.status === "rejected");
    expect(approvedStops).toHaveLength(2);
    expect(pendingStops).toHaveLength(1);
    expect(rejectedStops).toHaveLength(1);
    expect(stopsAfter).toHaveLength(4);

    const assignmentsAfter = approvalStore.loadAllAssignments();
    expect(assignmentsAfter.filter((a) => a.status === "approved")).toHaveLength(3);
    expect(assignmentsAfter.filter((a) => a.status === "pending")).toHaveLength(1);
    expect(assignmentsAfter.filter((a) => a.status === "rejected")).toHaveLength(1);

    // ── 12. Pending data doesn't count as approved ──
    expect(approvedStops.map((s) => s.id)).not.toContain("S3");
    expect(assignmentsAfter.filter((a) => a.status === "approved").map((a) => a.id))
      .not.toContain("A4");

    // ── 11. Rejected data doesn't become active ──
    expect(approvedStops.map((s) => s.id)).not.toContain("S4");
    expect(assignmentsAfter.filter((a) => a.status === "approved").map((a) => a.id))
      .not.toContain("A5");
    // ── 7. Driver edits a pending stop ──
    driverEditStop("S3", { name: "East Gate Revised", locationLabel: "Revised East Gate" });
    const editedStop = approvalStore.loadAllStops().find((s) => s.id === "S3")!;
    expect(editedStop.name).toBe("East Gate Revised");
    expect(editedStop.status).toBe("pending");

    // ── 8. Driver removes a pending assignment ──
    driverRemoveAssignment("A4");
    expect(approvalStore.loadAllAssignments().find((a) => a.id === "A4")).toBeUndefined();
    expect(approvalStore.loadAllAssignments()).toHaveLength(4);

    // ── 9. Driver requests a change to an approved stop (change request with replacesStopId) ──
    const changeReq = driverCreateChangeRequest("S1", {
      id: "S1-CR", name: "Green Park Relocated", locationLabel: "Green Park New Location",
      latitude: 28.56, longitude: 77.21, createdBy: "drv-1042", studentIds: [],
    });
    expect(changeReq.replacesStopId).toBe("S1");
    expect(changeReq.status).toBe("pending");

    // ── 10. Approved data doesn't change until Admin approves change request ──
    const preApproval = approvalStore.loadAllStops();
    const originalS1 = preApproval.find((s) => s.id === "S1")!;
    expect(originalS1.status).toBe("approved");
    expect(originalS1.name).toBe("Green Park");
    const crStop = preApproval.find((s) => s.id === "S1-CR")!;
    expect(crStop.status).toBe("pending");

    // Admin approves the change request — original is replaced
    approvalStore.approveStop("S1-CR");
    const postCR = approvalStore.loadAllStops();
    expect(postCR.find((s) => s.id === "S1")).toBeUndefined(); // original removed
    const approved_cr = postCR.find((s) => s.id === "S1-CR")!;
    expect(approved_cr.status).toBe("approved");
    expect(approved_cr.name).toBe("Green Park Relocated");
    expect(approved_cr.replacesStopId).toBeUndefined();

    // ── 17. No duplicate records ──
    const finalStops = approvalStore.loadAllStops();
    const stopIds = finalStops.map((s) => s.id);
    expect(new Set(stopIds).size).toBe(stopIds.length);

    const finalAssignments = approvalStore.loadAllAssignments();
    const asnIds = finalAssignments.map((a) => a.id);
    expect(new Set(asnIds).size).toBe(asnIds.length);
  });

  it("bulk approval works for stops and assignments", () => {
    // Setup
    driverCreateStop({ id: "B1", name: "Stop B1", locationLabel: "B1", latitude: 1, longitude: 1, createdBy: "drv", studentIds: [] });
    driverCreateStop({ id: "B2", name: "Stop B2", locationLabel: "B2", latitude: 2, longitude: 2, createdBy: "drv", studentIds: [] });
    driverCreateStop({ id: "B3", name: "Stop B3", locationLabel: "B3", latitude: 3, longitude: 3, createdBy: "drv", studentIds: [] });
    driverAssignStudent({ id: "BA1", studentId: "STU-01", studentName: "A", studentClass: "10", stopId: "B1", stopName: "Stop B1" });
    driverAssignStudent({ id: "BA2", studentId: "STU-02", studentName: "B", studentClass: "10", stopId: "B2", stopName: "Stop B2" });
    driverAssignStudent({ id: "BA3", studentId: "STU-03", studentName: "C", studentClass: "10", stopId: "B3", stopName: "Stop B3" });

    // ── 16. Bulk approval (stop approve also activates linked assignments) ──
    approvalStore.approveStops(["B1", "B2"]);
    const stops = approvalStore.loadAllStops();
    expect(stops.find((s) => s.id === "B1")!.status).toBe("approved");
    expect(stops.find((s) => s.id === "B2")!.status).toBe("approved");
    expect(stops.find((s) => s.id === "B3")!.status).toBe("pending");

    approvalStore.approveAssignments(["BA3"]);
    const asgns = approvalStore.loadAllAssignments();
    expect(asgns.find((a) => a.id === "BA1")!.status).toBe("approved");
    expect(asgns.find((a) => a.id === "BA2")!.status).toBe("approved");
    expect(asgns.find((a) => a.id === "BA3")!.status).toBe("approved");
  });

  it("individual approval works correctly", () => {
    driverCreateStop({ id: "IA1", name: "Individual Stop", locationLabel: "IA", latitude: 1, longitude: 1, createdBy: "drv", studentIds: [] });
    driverAssignStudent({ id: "IAA1", studentId: "STU-10", studentName: "X", studentClass: "9", stopId: "IA1", stopName: "Individual Stop" });

    // ── 15. Individual approval ──
    approvalStore.approveStop("IA1");
    expect(approvalStore.loadAllStops().find((s) => s.id === "IA1")!.status).toBe("approved");
    expect(approvalStore.loadPendingStops().find((s) => s.id === "IA1")).toBeUndefined();

    approvalStore.approveAssignment("IAA1");
    expect(approvalStore.loadAllAssignments().find((a) => a.id === "IAA1")!.status).toBe("approved");
    expect(approvalStore.loadPendingAssignments().find((a) => a.id === "IAA1")).toBeUndefined();
  });

  it("reload preserves data (re-read from localStorage)", async () => {
    driverCreateStop({ id: "R1", name: "Persist Stop", locationLabel: "R1", latitude: 1, longitude: 1, createdBy: "drv", studentIds: [] });
    driverAssignStudent({ id: "RA1", studentId: "STU-99", studentName: "Persist Student", studentClass: "10", stopId: "R1", stopName: "Persist Stop" });
    approvalStore.approveStop("R1");

    // ── 18. Reload preserves data ──
    vi.resetModules();
    const freshStore = await import("./transport-approval-store");
    const stops = freshStore.loadAllStops();
    expect(stops.find((s) => s.id === "R1")!.status).toBe("approved");
    const asgns = freshStore.loadAllAssignments();
    expect(asgns.find((a) => a.id === "RA1")).toBeDefined();
  });

  it("rejected stops and assignments stay rejected", () => {
    driverCreateStop({ id: "RJ1", name: "Reject Me", locationLabel: "RJ", latitude: 1, longitude: 1, createdBy: "drv", studentIds: [] });
    driverAssignStudent({ id: "RJA1", studentId: "STU-RJ", studentName: "Rejected", studentClass: "10", stopId: "RJ1", stopName: "Reject Me" });

    approvalStore.rejectStop("RJ1");
    approvalStore.rejectAssignment("RJA1");

    expect(approvalStore.loadAllStops().find((s) => s.id === "RJ1")!.status).toBe("rejected");
    expect(approvalStore.loadAllAssignments().find((a) => a.id === "RJA1")!.status).toBe("rejected");
    expect(approvalStore.loadPendingStops().find((s) => s.id === "RJ1")).toBeUndefined();
    expect(approvalStore.loadPendingAssignments().find((a) => a.id === "RJA1")).toBeUndefined();
  });

  it("emits approval changed events on approve/reject", () => {
    driverCreateStop({ id: "EV1", name: "Event Stop", locationLabel: "EV", latitude: 1, longitude: 1, createdBy: "drv", studentIds: [] });
    dispatched.length = 0;

    approvalStore.approveStop("EV1");
    expect(dispatched).toContain("lumenx-transport-approval-changed");
  });
});
