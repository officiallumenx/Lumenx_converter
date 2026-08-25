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

describe("transport notification bridge", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("pushes driver approve/decline/lock and admin trip/sos events", async () => {
    const n = await import("./transport-notification-bridge");

    n.notifyDriverStopApproved({ stopId: "s1", stopName: "Gate A", routeCode: "NCL" });
    n.notifyDriverStopDeclined({
      stopId: "s2",
      stopName: "Gate B",
      reason: "GPS inaccurate",
    });
    n.notifyDriverRouteLocked({ routeId: "RT-01", routeName: "North Campus" });
    n.notifyDriverRouteUnlocked({ routeId: "RT-01", routeName: "North Campus" });
    n.notifyAdminStopRequest({
      stopId: "s3",
      stopName: "Gate C",
      resubmit: true,
      driverName: "Rajesh",
    });
    n.notifyAdminTripStarted({
      tripId: "trip-1",
      busNumber: "BUS-01",
      routeCode: "NCL",
      driverName: "Rajesh",
    });
    n.notifyAdminTripEnded({
      tripId: "trip-1",
      busNumber: "BUS-01",
      routeCode: "NCL",
      driverName: "Rajesh",
    });
    n.notifyAdminSos({
      emergencyId: "SOS-9",
      driverName: "Rajesh",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
    });
    n.notifyDriverSosAcknowledged({ emergencyId: "SOS-9", note: "On it" });
    n.notifyDriverSosResolved({
      emergencyId: "SOS-9",
      note: "Help arrived",
      resolvedBy: "Admin",
    });

    const driver = n.listTransportNotifications("driver");
    expect(driver.some((x) => x.title === "Stop approved")).toBe(true);
    expect(driver.some((x) => x.title === "Stop request declined" && x.reason === "GPS inaccurate")).toBe(
      true,
    );
    expect(driver.some((x) => x.title === "Route setup locked")).toBe(true);
    expect(driver.some((x) => x.title === "Route setup unlocked")).toBe(true);
    expect(driver.some((x) => x.title === "SOS acknowledged")).toBe(true);
    expect(driver.some((x) => x.title === "Emergency Resolved")).toBe(true);
    expect(driver.find((x) => x.title === "Stop approved")?.href).toBe("/more/route-setup");
    expect(driver.find((x) => x.title === "SOS acknowledged")?.href).toBe("/emergency");

    const admin = n.listTransportNotifications("admin");
    expect(admin.some((x) => x.title === "Stop request resubmitted")).toBe(true);
    expect(admin.some((x) => x.title === "Trip started" && x.priority === "important")).toBe(true);
    expect(admin.some((x) => x.title === "Trip completed")).toBe(true);
    expect(admin.some((x) => x.title === "SOS raised" && x.priority === "critical")).toBe(true);

    const connect = n.listTransportNotifications("connect");
    expect(connect.some((x) => x.title === "Trip started")).toBe(true);
    expect(connect.some((x) => x.title === "Trip completed")).toBe(true);
    expect(connect.some((x) => x.title === "Emergency on your bus")).toBe(true);

    const unreadBefore = driver.filter((x) => x.unread).length;
    expect(unreadBefore).toBeGreaterThan(0);
    n.markAllTransportNotificationsRead("driver");
    expect(n.listTransportNotifications("driver").every((x) => !x.unread)).toBe(true);
  });

  it("covers boarding, approach, school, drop, pending, and emergency severities", async () => {
    const n = await import("./transport-notification-bridge");

    n.notifyConnectBusApproach({
      tripId: "t1",
      studentId: "S1",
      studentName: "Asha",
      stopName: "Lake View",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      minutes: 30,
    });
    n.notifyConnectBusApproach({
      tripId: "t1",
      studentId: "S1",
      studentName: "Asha",
      stopName: "Lake View",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      minutes: 15,
    });
    n.notifyConnectBusApproach({
      tripId: "t1",
      studentId: "S1",
      studentName: "Asha",
      stopName: "Lake View",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      minutes: 5,
      busStatus: "en route",
    });
    n.notifyConnectStudentBoarded({
      tripId: "t1",
      studentId: "S1",
      studentName: "Asha",
      stopName: "Lake View",
      vehicleNumber: "BUS-01",
    });
    n.notifyConnectStudentNotBoarded({
      tripId: "t1",
      studentId: "S2",
      studentName: "Ravi",
      stopName: "Lake View",
      vehicleNumber: "BUS-01",
    });
    n.notifyConnectReachedSchool({
      tripId: "t1",
      busNumber: "BUS-01",
      routeCode: "NCL",
    });
    n.notifyConnectBoardingStarted({
      tripId: "t1",
      busNumber: "BUS-01",
      routeCode: "NCL",
    });
    n.notifyConnectStudentDropped({
      tripId: "t1",
      studentId: "S1",
      studentName: "Asha",
      stopName: "Lake View",
      vehicleNumber: "BUS-01",
    });
    n.notifyAdminTransportAttendancePending({
      tripId: "t1",
      busNumber: "BUS-01",
      routeCode: "NCL",
      driverName: "Rajesh",
      pendingCount: 2,
    });
    n.notifyAdminEmergency({
      emergencyId: "E1",
      driverName: "Rajesh",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      kind: "breakdown",
    });
    n.notifyAdminEmergency({
      emergencyId: "E2",
      driverName: "Rajesh",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      kind: "delay",
    });
    n.notifyAdminEmergency({
      emergencyId: "E3",
      driverName: "Rajesh",
      vehicleNumber: "BUS-01",
      routeCode: "NCL",
      kind: "route_issue",
    });

    const connect = n.listTransportNotifications("connect");
    expect(connect.filter((x) => x.category === "approach")).toHaveLength(3);
    expect(connect.some((x) => x.title === "Student boarded")).toBe(true);
    expect(connect.some((x) => x.title === "Student not boarded")).toBe(true);
    expect(connect.some((x) => x.title === "Reached school")).toBe(true);
    expect(connect.some((x) => x.title === "Boarding started")).toBe(true);
    expect(connect.some((x) => x.title === "Child dropped successfully")).toBe(true);
    expect(connect.find((x) => x.meta?.minutes === "30")?.message).toContain("Lake View");
    expect(connect.find((x) => x.meta?.minutes === "5")?.priority).toBe("important");

    const admin = n.listTransportNotifications("admin");
    expect(admin.some((x) => x.title === "Transport attendance not submitted")).toBe(true);
    expect(admin.some((x) => x.title === "Bus breakdown" && x.priority === "critical")).toBe(true);
    expect(admin.some((x) => x.title === "Major delay" && x.priority === "important")).toBe(true);
    expect(admin.some((x) => x.title === "Route issue" && x.priority === "important")).toBe(true);
  });
});
