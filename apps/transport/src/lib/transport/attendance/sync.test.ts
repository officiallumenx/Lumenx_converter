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
  getPendingAttendanceOps: vi.fn(() => []),
}));

vi.mock("../trip/store", () => ({
  getTripSessionSnapshot: vi.fn(() => ({
    tripId: "trip-1",
    phase: "boarding",
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

import { enqueueOpsEvent, isOpsOutboxOnline, getPendingAttendanceOps } from "../ops-outbox";
import { listBoardingViaApi } from "../trip/api-ops";
import { getTripSessionSnapshot } from "../trip/store";
import {
  getAttendanceSnapshot,
  setApiAttendanceRoster,
  setStudentSyncStatus,
  setAttendanceVehicleScope,
  hydrateAttendanceFromApi,
} from "./store";
import {
  attendanceRepository,
  __notifyAttendanceOutboxForTests,
} from "./repository";

describe("attendance sync via ops-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOpsOutboxOnline).mockReturnValue(true);
    vi.mocked(getTripSessionSnapshot).mockReturnValue({
      tripId: "trip-1",
      phase: "boarding",
      endSyncPending: false,
      currentStopIndex: 0,
      assignment: {
        route: { stops: [{ id: "stop-1", name: "Gate", sequence: 0 }] },
      },
    } as never);
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

  it("rolls back optimistic mark when outbox reports permanent rejection", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

    __notifyAttendanceOutboxForTests("rejected", {
      studentId: "stu-1",
      eventType: "boarding",
      message: "Student not enrolled on this route",
    });

    const after = getAttendanceSnapshot()[0];
    expect(after?.boarding).toBe("pending");
    expect(after?.syncStatus).toBe("error");
  });

  it("does not roll back on retryable network error even if max retries given up", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

    __notifyAttendanceOutboxForTests("failed", {
      studentId: "stu-1",
      eventType: "boarding",
      message: "Network request failed",
      giveUp: true,
      rejected: false,
    });

    const after = getAttendanceSnapshot()[0];
    // Remains marked as boarded so driver knows student is on bus, syncStatus error shows "Failed — tap to retry"
    expect(after?.boarding).toBe("boarded");
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

  it("queues drop with authoritative common stop", async () => {
    setApiAttendanceRoster([
      {
        id: "stu-1",
        name: "Ada",
        grade: "5",
        stopName: "Gate",
        stopId: "stop-pickup",
        dropStopId: "stop-pickup",
        dropStopName: "Gate",
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
        stopId: "stop-pickup",
        payload: { droppingStatus: "dropped" },
      }),
    );
  });

  it("uses pickup stop when dropStopId omitted from roster seed (not school)", async () => {
    vi.mocked(getTripSessionSnapshot).mockReturnValue({
      tripId: "trip-evening",
      phase: "dropping",
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
        stopId: "stop-pickup",
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

  it("boards unassigned student at current route stop when stopId is unassigned", async () => {
    setApiAttendanceRoster([
      {
        id: "stu-1",
        name: "Ada",
        grade: "5",
        stopName: "Stop not assigned",
        stopId: "",
        rollNo: "1",
      },
    ]);
    await Promise.resolve();
    await Promise.resolve();
    vi.mocked(enqueueOpsEvent).mockClear();
    const result = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(result.ok).toBe(true);
    expect(result.pending).toBe(true);
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    expect(getAttendanceSnapshot()[0]?.stopId).toBe("stop-1");
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "boarding",
        studentId: "stu-1",
        stopId: "stop-1",
      }),
    );
  });

  it("rejects boarding when stopId is unassigned AND route has no stops", async () => {
    vi.mocked(getTripSessionSnapshot).mockReturnValue({
      tripId: "trip-1",
      phase: "boarding",
      endSyncPending: false,
      currentStopIndex: 0,
      assignment: {
        route: { stops: [] },
      },
    } as never);
    setApiAttendanceRoster([
      {
        id: "stu-1",
        name: "Ada",
        grade: "5",
        stopName: "Stop not assigned",
        stopId: "",
        rollNo: "1",
      },
    ]);
    await Promise.resolve();
    await Promise.resolve();
    vi.mocked(enqueueOpsEvent).mockClear();
    const result = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("invalid");
    expect(result.reason).toMatch(/Stop not assigned/i);
    expect(enqueueOpsEvent).not.toHaveBeenCalled();
  });

  it("preserves optimistic mark on temporary network failure (giveUp: false)", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

    __notifyAttendanceOutboxForTests("failed", {
      studentId: "stu-1",
      eventType: "boarding",
      message: "Network glitch",
      giveUp: false,
    });

    const after = getAttendanceSnapshot()[0];
    expect(after?.boarding).toBe("boarded");
    expect(after?.syncStatus).toBe("error");
  });

  it("blocks rapid duplicate taps across microtasks until outbox confirms", async () => {
    const first = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(first.ok).toBe(true);
    expect(enqueueOpsEvent).toHaveBeenCalledTimes(1);

    const second = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(second.ok).toBe(false);
    expect(second.code).toBe("busy");
    expect(enqueueOpsEvent).toHaveBeenCalledTimes(1);

    __notifyAttendanceOutboxForTests("confirmed", {
      studentId: "stu-1",
      eventType: "boarding",
    });

    const third = await attendanceRepository.markBoarding("stu-1", "not_boarded");
    expect(third.ok).toBe(true);
    expect(enqueueOpsEvent).toHaveBeenCalledTimes(2);
  });

  it("rejects marks when trip phase is completed", async () => {
    vi.mocked(getTripSessionSnapshot).mockReturnValue({
      tripId: "trip-1",
      phase: "completed",
      endSyncPending: false,
      currentStopIndex: 0,
      assignment: {
        route: { stops: [{ id: "stop-1", name: "Gate", sequence: 0 }] },
      },
    } as never);
    const result = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("finalized");
    expect(enqueueOpsEvent).not.toHaveBeenCalled();
  });

  it("rejects marks while endSyncPending even if phase looks active", async () => {
    vi.mocked(getTripSessionSnapshot).mockReturnValue({
      tripId: "trip-1",
      phase: "boarding",
      endSyncPending: true,
      currentStopIndex: 0,
      assignment: {
        route: { stops: [{ id: "stop-1", name: "Gate", sequence: 0 }] },
      },
    } as never);
    const result = await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("finalized");
    expect(enqueueOpsEvent).not.toHaveBeenCalled();
  });

  it("preserves boarded status across roster reseed before hydrate settles", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
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
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");
  });

  it("preserves active session attendance marks across vehicle scope changes", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");

    // Scope change (e.g. TanStack query re-evaluating vehicleId)
    setAttendanceVehicleScope("veh-bus-42");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");
  });

  it("hydrates pending attendance actions from outbox after app restart", async () => {
    // Simulate app restart: store reset with no in-memory marks
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
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("pending");

    // Outbox persisted an unconfirmed boarding event from prior session
    vi.mocked(getPendingAttendanceOps).mockReturnValueOnce([
      {
        clientEventId: "client-prev-1",
        eventType: "boarding",
        tripId: "trip-1",
        studentId: "stu-1",
        stopId: "stop-1",
        status: "queued",
        sequence: 1,
        capturedAt: new Date().toISOString(),
        retryCount: 0,
        payload: { boardingStatus: "boarded" },
      } as never,
    ]);

    // Server list returns empty (offline/in-flight)
    vi.mocked(listBoardingViaApi).mockResolvedValueOnce([]);

    await hydrateAttendanceFromApi();

    // Roster is safely restored to boarded with syncing status!
    const snapshot = getAttendanceSnapshot();
    expect(snapshot[0]?.boarding).toBe("boarded");
    expect(snapshot[0]?.syncStatus).toBe("syncing");
  });

  it("discards stale out-of-order hydration responses", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

    let resolveOldPoll: (val: unknown) => void;
    const oldPromise = new Promise((resolve) => {
      resolveOldPoll = resolve;
    });

    // Slow poll request started first
    vi.mocked(listBoardingViaApi).mockReturnValueOnce(oldPromise as never);
    const slowHydration = hydrateAttendanceFromApi();

    // Fast poll request finished later with confirmed mark
    vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
      {
        studentId: "stu-1",
        boardingStatus: "boarded",
        droppingStatus: "pending",
        boardedAt: "2026-11-09T10:05:00Z",
        droppedAt: null,
      } as never,
    ]);
    await hydrateAttendanceFromApi();
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("idle");
    expect(getAttendanceSnapshot()[0]?.boardedAt).toBe("2026-11-09T10:05:00Z");

    // Old poll now resolves with empty marks (from before the student boarded)
    resolveOldPoll!([]);
    await slowHydration;

    // Stale response is discarded, board status and timestamp are preserved!
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    expect(getAttendanceSnapshot()[0]?.boardedAt).toBe("2026-11-09T10:05:00Z");
  });

  it("soak test: 15-minute simulated cellular soak preserves boarding state across 90 polls and network flips", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

    // 15 minutes with 10-second polling = 90 poll cycles
    for (let cycle = 1; cycle <= 90; cycle++) {
      const isOnline = cycle % 4 !== 0; // Simulate weak 3G dropping every 4th cycle
      vi.mocked(isOpsOutboxOnline).mockReturnValue(isOnline);

      if (cycle === 5) {
        // Transient network retry failure
        __notifyAttendanceOutboxForTests("failed", {
          studentId: "stu-1",
          eventType: "boarding",
          message: "Cellular handover timeout",
          giveUp: false,
          rejected: false,
        });
      } else if (cycle === 10) {
        // Outbox retry exhausted
        __notifyAttendanceOutboxForTests("failed", {
          studentId: "stu-1",
          eventType: "boarding",
          message: "Max retries reached in tunnel",
          giveUp: true,
          rejected: false,
        });
      } else if (cycle === 15) {
        // Scope change during background refetch
        setAttendanceVehicleScope(`veh-${cycle}`);
      } else if (cycle === 20) {
        // Server confirmation arrives on reconnect
        __notifyAttendanceOutboxForTests("confirmed", {
          studentId: "stu-1",
          eventType: "boarding",
        });
        vi.mocked(listBoardingViaApi).mockResolvedValue([
          {
            studentId: "stu-1",
            boardingStatus: "boarded",
            droppingStatus: "pending",
            boardedAt: "2026-11-09T10:00:00Z",
            droppedAt: null,
          } as never,
        ]);
      }

      await hydrateAttendanceFromApi();

      // State MUST NEVER revert back to "pending" during the entire 15 minutes!
      const student = getAttendanceSnapshot()[0];
      expect(student?.boarding).toBe("boarded");
    }
  });

  describe("regression: existing DB row & polling clobbering (boarding and dropping)", () => {
    it("does NOT revert dropping from dropped to pending during in-flight poll when morning boarding row already exists", async () => {
      // Simulate afternoon phase with existing morning boarding row on server
      vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
        {
          studentId: "stu-1",
          boardingStatus: "boarded",
          droppingStatus: "pending",
          boardedAt: "2026-11-09T08:00:00Z",
          droppedAt: null,
        } as never,
      ]);
      await hydrateAttendanceFromApi();
      expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
      expect(getAttendanceSnapshot()[0]?.dropping).toBe("pending");

      // Driver clicks Dropped -> optimistic state becomes "dropped", syncStatus: "syncing"
      await attendanceRepository.markDropping("stu-1", "dropped");
      expect(getAttendanceSnapshot()[0]?.dropping).toBe("dropped");
      expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");

      // Stale/concurrent poll returns existing server row before POST /drop completes
      vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
        {
          studentId: "stu-1",
          boardingStatus: "boarded",
          droppingStatus: "pending",
          boardedAt: "2026-11-09T08:00:00Z",
          droppedAt: null,
        } as never,
      ]);
      await hydrateAttendanceFromApi();

      const after = getAttendanceSnapshot()[0];
      expect(after?.dropping).toBe("dropped");
      expect(after?.syncStatus).toBe("syncing");
    });

    it("does NOT revert boarding from boarded to pending during in-flight poll when a row (e.g. pending/undone) already exists on server", async () => {
      await attendanceRepository.markBoarding("stu-1", "boarded");
      expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
      expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");

      // Server has an existing row with boardingStatus: "pending" (e.g., from prior undo or drop-first)
      vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
        {
          studentId: "stu-1",
          boardingStatus: "pending",
          droppingStatus: "pending",
          boardedAt: null,
          droppedAt: null,
        } as never,
      ]);
      await hydrateAttendanceFromApi();

      const after = getAttendanceSnapshot()[0];
      expect(after?.boarding).toBe("boarded");
      expect(after?.syncStatus).toBe("syncing");
    });

    it("discards a pre-mutation poll that resolves AFTER a local mark and confirmation", async () => {
      let resolveOldPoll: (val: unknown) => void;
      const oldPollPromise = new Promise((resolve) => {
        resolveOldPoll = resolve;
      });
      vi.mocked(listBoardingViaApi).mockReturnValueOnce(oldPollPromise as never);
      const oldPoll = hydrateAttendanceFromApi();

      // Driver taps Boarded while oldPoll is still in flight
      await attendanceRepository.markBoarding("stu-1", "boarded");
      __notifyAttendanceOutboxForTests("confirmed", {
        studentId: "stu-1",
        eventType: "boarding",
      });
      expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");

      // Pre-mutation poll finally resolves with empty/pending state
      resolveOldPoll!([
        {
          studentId: "stu-1",
          boardingStatus: "pending",
          droppingStatus: "pending",
          boardedAt: null,
          droppedAt: null,
        } as never,
      ]);
      await oldPoll;

      expect(getAttendanceSnapshot()[0]?.boarding).toBe("boarded");
    });

    it("preserves dropping syncStatus='error' across subsequent polls when morning DB row exists", async () => {
      vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
        {
          studentId: "stu-1",
          boardingStatus: "boarded",
          droppingStatus: "pending",
          boardedAt: "2026-11-09T08:00:00Z",
          droppedAt: null,
        } as never,
      ]);
      await hydrateAttendanceFromApi();

      await attendanceRepository.markDropping("stu-1", "dropped");
      __notifyAttendanceOutboxForTests("failed", {
        studentId: "stu-1",
        eventType: "drop",
        message: "Network timeout",
        giveUp: false,
        rejected: false,
      });
      expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("error");
      expect(getAttendanceSnapshot()[0]?.dropping).toBe("dropped");

      // Next poll returns server state (still droppingStatus: "pending")
      vi.mocked(listBoardingViaApi).mockResolvedValueOnce([
        {
          studentId: "stu-1",
          boardingStatus: "boarded",
          droppingStatus: "pending",
          boardedAt: "2026-11-09T08:00:00Z",
          droppedAt: null,
        } as never,
      ]);
      await hydrateAttendanceFromApi();

      expect(getAttendanceSnapshot()[0]?.dropping).toBe("dropped");
      expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("error");
    });

    it("shows error state (not 'confirmed') when server returns non-idempotent 409 conflict rejection", async () => {
      await attendanceRepository.markBoarding("stu-1", "boarded");
      __notifyAttendanceOutboxForTests("conflict", {
        studentId: "stu-1",
        eventType: "boarding",
        message: "Trip is already completed",
      });

      const after = getAttendanceSnapshot()[0];
      expect(after?.syncStatus).toBe("error");
    });
  });
});
