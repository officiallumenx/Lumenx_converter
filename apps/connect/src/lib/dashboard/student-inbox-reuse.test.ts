import { beforeEach, describe, expect, it, vi } from "vitest";

const loadConnectPortalInbox = vi.fn();

vi.mock("@/lib/connect-inbox/load", () => ({
  loadConnectPortalInbox: (...args: unknown[]) => loadConnectPortalInbox(...args),
}));
vi.mock("@/lib/marks", () => ({
  loadStudentReportCards: vi.fn(async () => ({ status: "empty", reportCards: [] })),
}));
vi.mock("@/lib/exams", () => ({
  loadLearnerExamSchedules: vi.fn(async () => ({ status: "empty", schedules: [] })),
}));
vi.mock("@/lib/events", () => ({
  loadConnectEvents: vi.fn(async () => ({ status: "empty", items: [] })),
  pickUpcomingEvents: (items: unknown[]) => items,
}));
vi.mock("@/lib/timetable", () => ({
  loadLearnerTimetable: vi.fn(async () => ({ status: "empty", schedule: {} })),
}));
vi.mock("@/lib/attendance/load", () => ({
  loadLearnerAttendancePortal: vi.fn(async () => ({ portal: null })),
}));

describe("enrichStudentDashboardSnapshot inbox reuse", () => {
  beforeEach(() => {
    vi.resetModules();
    loadConnectPortalInbox.mockReset();
    loadConnectPortalInbox.mockResolvedValue([{ id: "n1" }]);
  });

  it("skips notifications fetch when inbox is preloaded", async () => {
    const { enrichStudentDashboardSnapshot } = await import("./load-student-dashboard");
    const shared = [{ id: "shared", title: "S", unread: false }] as never;
    const base = {
      profile: { id: "22222222-2222-4222-8222-222222222222", class: "10", name: "S" },
      timetable: {},
    } as never;
    const next = await enrichStudentDashboardSnapshot({
      instituteId: "11111111-1111-4111-8111-111111111111",
      snapshot: base,
      inbox: shared,
    });
    expect(loadConnectPortalInbox).not.toHaveBeenCalled();
    expect(next.notifications).toEqual(shared);
  });
});
