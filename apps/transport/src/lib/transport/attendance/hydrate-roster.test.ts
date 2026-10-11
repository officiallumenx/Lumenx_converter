import { beforeEach, describe, expect, it, vi } from "vitest";

const listBoardingViaApi = vi.fn();
const getTripSessionSnapshot = vi.fn();

vi.mock("../trip/api-ops", () => ({
  listBoardingViaApi: (...args: unknown[]) => listBoardingViaApi(...args),
}));

vi.mock("../trip/store", () => ({
  getTripSessionSnapshot: () => getTripSessionSnapshot(),
  subscribeTripSession: () => () => {},
}));

describe("hydrateAttendanceFromApi with separate Drop trip_id", () => {
  beforeEach(() => {
    vi.resetModules();
    listBoardingViaApi.mockReset();
    getTripSessionSnapshot.mockReset();
    getTripSessionSnapshot.mockReturnValue({
      tripId: null,
      slot: null,
      phase: "ready",
    });
    listBoardingViaApi.mockResolvedValue([]);
  });

  it("keeps all assigned students pending on evening trip with empty marks", async () => {
    getTripSessionSnapshot.mockReturnValue({
      tripId: "evening-trip-id",
      slot: "evening",
      phase: "running",
    });
    listBoardingViaApi.mockResolvedValue([]);

    const {
      setApiAttendanceRoster,
      hydrateAttendanceFromApi,
      getAttendanceSnapshot,
    } = await import("./store");

    setApiAttendanceRoster([
      {
        id: "stu-a",
        name: "A",
        grade: "10",
        stopName: "Oak",
        stopId: "stop-a",
        rollNo: "1",
        dropStopId: "stop-drop",
        dropStopName: "School",
      },
      {
        id: "stu-b",
        name: "B",
        grade: "10",
        stopName: "Pine",
        stopId: "stop-b",
        rollNo: "2",
        dropStopId: "stop-drop",
        dropStopName: "School",
      },
    ]);

    await hydrateAttendanceFromApi();
    const snap = getAttendanceSnapshot();
    expect(snap).toHaveLength(2);
    expect(snap.every((s) => s.boarding === "pending")).toBe(true);
    expect(snap.every((s) => s.dropping === "pending")).toBe(true);
    expect(listBoardingViaApi).toHaveBeenCalledWith("evening-trip-id");
  });

  it("applies Drop marks for evening trip without requiring Pickup boarding on same trip_id", async () => {
    getTripSessionSnapshot.mockReturnValue({
      tripId: "evening-trip-id",
      slot: "evening",
      phase: "dropping",
    });
    listBoardingViaApi.mockResolvedValue([
      {
        studentId: "stu-a",
        boardingStatus: "pending",
        droppingStatus: "dropped",
        boardedAt: null,
        droppedAt: "2026-08-21T15:00:00.000Z",
        stopName: "School",
        stopId: "stop-drop",
      },
    ]);

    const {
      setApiAttendanceRoster,
      hydrateAttendanceFromApi,
      getAttendanceSnapshot,
    } = await import("./store");

    setApiAttendanceRoster([
      {
        id: "stu-a",
        name: "A",
        grade: "10",
        stopName: "Oak",
        stopId: "stop-a",
        rollNo: "1",
      },
    ]);

    await hydrateAttendanceFromApi();
    const snap = getAttendanceSnapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0]?.boarding).toBe("pending");
    expect(snap[0]?.dropping).toBe("dropped");
  });
});
