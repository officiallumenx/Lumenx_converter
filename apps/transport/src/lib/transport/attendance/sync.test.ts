import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    message: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../ops-outbox", () => ({
  enqueueOpsEvent: vi.fn((input: { clientEventId?: string }) => ({
    clientEventId: input.clientEventId ?? "generated",
  })),
  flushOpsOutbox: vi.fn(async () => undefined),
  isOpsOutboxOnline: vi.fn(() => true),
  retryFailedStudentEvents: vi.fn(),
}));

vi.mock("../trip/store", () => ({
  getTripSessionSnapshot: vi.fn(() => ({
    tripId: "trip-1",
    currentStopIndex: 0,
    assignment: {
      route: { stops: [{ id: "stop-1", name: "Gate", sequence: 0 }] },
    },
  })),
  subscribeTripSession: vi.fn(() => () => undefined),
}));

vi.mock("../trip/api-ops", () => ({
  hydrateActiveTripFromApi: vi.fn(),
  listBoardingViaApi: vi.fn(async () => []),
}));

import { enqueueOpsEvent, isOpsOutboxOnline } from "../ops-outbox";
import { listBoardingViaApi } from "../trip/api-ops";
import { getTripSessionSnapshot } from "../trip/store";
import {
  getAttendanceSnapshot,
  setApiAttendanceRoster,
  setStudentSyncStatus,
} from "./store";
import {
  attendanceRepository,
  __notifyAttendanceOutboxForTests,
} from "./repository";

describe("attendance sync via ops-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOpsOutboxOnline).mockReturnValue(true);
    attendanceRepository.reset();
    setApiAttendanceRoster([
      {
        id: "stu-1",
        name: "Ada",
        grade: "5",
        stopName: "Gate",
        stopId: "stop-1",
        rollNo: "1",
      },
    ]);
  });

  it("keeps optimistic mark and queues with Syncing (no silent revert)", async () => {
    const result = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(result.ok).toBe(true);
    expect(result.pending).toBe(true);
    expect(result.queuedOffline).toBe(false);
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "boarding",
        studentId: "stu-1",
        tripId: "trip-1",
      }),
    );
  });

  it("queues offline without losing the mark and flags queuedOffline", async () => {
    vi.mocked(isOpsOutboxOnline).mockReturnValue(false);
    const result = await attendanceRepository.markBoarding("stu-1", "not_boarded");
    expect(result.ok).toBe(true);
    expect(result.queuedOffline).toBe(true);
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("not_boarded");
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "not_boarded" }),
    );
  });

  it("rejects duplicate marks while syncing (mutex)", async () => {
    const first = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(first.ok).toBe(true);
    expect(enqueueOpsEvent).toHaveBeenCalledTimes(1);

    const second = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(second.ok).toBe(false);
    expect(second.code).toBe("busy");
    expect(enqueueOpsEvent).toHaveBeenCalledTimes(1);
  });

  it("rolls back optimistic mark when outbox reports failure", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

    __notifyAttendanceOutboxForTests("failed", {
      studentId: "stu-1",
      eventType: "boarding",
      message: "Network error",
    });

    const after = getAttendanceSnapshot()[0];
    expect(after?.boarding).toBe("pending");
    expect(after?.syncStatus).toBe("error");
  });

  it("marks confirmed after authoritative outbox confirm", async () => {
    vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
      {
        studentId: "stu-1",
        boardingStatus: "boarded",
        droppingStatus: "pending",
        boardedAt: "2026-10-15T10:00:00.000Z",
        droppedAt: null,
        stopName: "Gate",
        stopId: "stop-1",
      },
    ] as never);
    await attendanceRepository.markBoarding("stu-1", "boarded");
    __notifyAttendanceOutboxForTests("confirmed", {
      studentId: "stu-1",
      eventType: "boarding",
      clientEventId: "board-1",
    });
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("confirmed");
    await Promise.resolve();
    await Promise.resolve();
    // After hydrate merges server SoT, chip settles to idle with boarded status.
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
  });

  it("sends stable client_event_id on boarding mark", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    const arg = vi.mocked(enqueueOpsEvent).mock.calls[0]?.[0];
    expect(arg?.clientEventId).toMatch(/^board-/);
  });

  it("queues drop with enrollment dropStopId (not pickup)", async () => {
    setApiAttendanceRoster([
      {
        id: "stu-1",
        name: "Ada",
        grade: "5",
        stopName: "Gate",
        stopId: "stop-pickup",
        dropStopId: "stop-school",
        dropStopName: "School",
        rollNo: "1",
      },
    ]);
    // Let hydrateAttendanceFromApi (fired by setApiAttendanceRoster) settle first.
    await Promise.resolve();
    await Promise.resolve();
    const result = await attendanceRepository.markDropping("stu-1", "dropped");
    expect(result.ok).toBe(true);
    expect(result.pending).toBe(true);
    expect(getAttendanceSnapshot()[0]?.dropping).toBe("dropped");
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "drop",
        studentId: "stu-1",
        tripId: "trip-1",
        stopId: "stop-school",
        payload: { droppingStatus: "dropped" },
      }),
    );
  });

  it("uses last route stop when dropStopId omitted from roster seed", async () => {
    vi.mocked(getTripSessionSnapshot).mockReturnValue({
      tripId: "trip-evening",
      currentStopIndex: 0,
      assignment: {
        route: {
          stops: [
            { id: "stop-pickup", name: "Gate", sequence: 0 },
            { id: "stop-school", name: "School", sequence: 1 },
          ],
        },
      },
    } as never);

    setApiAttendanceRoster([
      {
        id: "stu-1",
        name: "Ada",
        grade: "5",
        stopName: "Gate",
        stopId: "stop-pickup",
        rollNo: "1",
      },
    ]);
    await Promise.resolve();
    await Promise.resolve();
    await attendanceRepository.markDropping("stu-1", "dropped");
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "drop",
        stopId: "stop-school",
      }),
    );
  });

  it("allows retry after error by enqueueing a fresh event", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    __notifyAttendanceOutboxForTests("failed", {
      studentId: "stu-1",
      eventType: "boarding",
      message: "timeout",
    });
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("error");
    vi.mocked(enqueueOpsEvent).mockClear();

    const retry = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(retry.ok).toBe(true);
    expect(retry.pending).toBe(true);
    expect(enqueueOpsEvent).toHaveBeenCalledTimes(1);
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");
  });

  it("does not treat idle confirmed students as busy", async () => {
    setStudentSyncStatus("stu-1", "confirmed");
    const result = await attendanceRepository.markBoarding("stu-1", "not_boarded");
    expect(result.ok).toBe(true);
    expect(result.code).not.toBe("busy");
  });
});
