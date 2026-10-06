import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { getAttendanceSnapshot, setApiAttendanceRoster } from "./store";
import { attendanceRepository } from "./repository";

describe("attendance sync via ops-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOpsOutboxOnline).mockReturnValue(true);
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

  it("queues offline without losing the mark", async () => {
    vi.mocked(isOpsOutboxOnline).mockReturnValue(false);
    await attendanceRepository.markBoarding("stu-1", "not_boarded");
    expect(getAttendanceSnapshot()[0]?.boarding).toBe("not_boarded");
    expect(getAttendanceSnapshot()[0]?.syncStatus).toBe("syncing");
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "not_boarded" }),
    );
  });

  it("sends stable client_event_id on boarding mark", async () => {
    await attendanceRepository.markBoarding("stu-1", "boarded");
    const arg = vi.mocked(enqueueOpsEvent).mock.calls[0]?.[0];
    expect(arg?.clientEventId).toMatch(/^board-/);
  });
});
