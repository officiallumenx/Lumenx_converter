import { beforeEach, describe, expect, it, vi } from "vitest";

const loadConnectPortalInbox = vi.fn();
const getStudent = vi.fn();
const loadStudentReportCards = vi.fn();
const loadStudentHomeworkItems = vi.fn();
const loadLearnerAttendancePortal = vi.fn();
const loadLearnerTimetable = vi.fn();
const listStudentRemarks = vi.fn();

vi.mock("@/lib/connect-inbox/load", () => ({
  loadConnectPortalInbox: (...args: unknown[]) => loadConnectPortalInbox(...args),
}));
vi.mock("@/lib/students/api", () => ({
  getStudent: (...args: unknown[]) => getStudent(...args),
}));
vi.mock("@/lib/marks", () => ({
  loadStudentReportCards: (...args: unknown[]) => loadStudentReportCards(...args),
}));
vi.mock("@/lib/homework", () => ({
  loadStudentHomeworkItems: (...args: unknown[]) => loadStudentHomeworkItems(...args),
}));
vi.mock("@/lib/attendance/load", () => ({
  loadLearnerAttendancePortal: (...args: unknown[]) => loadLearnerAttendancePortal(...args),
}));
vi.mock("@/lib/timetable", () => ({
  loadLearnerTimetable: (...args: unknown[]) => loadLearnerTimetable(...args),
}));
vi.mock("@/lib/remarks", () => ({
  listStudentRemarks: (...args: unknown[]) => listStudentRemarks(...args),
  mapRemarkDtoToParentCard: (d: unknown) => d,
}));

const INST = "11111111-1111-4111-8111-111111111111";
const CHILD = "22222222-2222-4222-8222-222222222222";

describe("loadParentPortalSnapshotFromApi inbox reuse", () => {
  beforeEach(() => {
    vi.resetModules();
    loadConnectPortalInbox.mockReset();
    getStudent.mockResolvedValue({
      id: CHILD,
      displayName: "Child",
      classLabel: "10",
      sectionLabel: "A",
      rollNo: "1",
    });
    loadStudentReportCards.mockResolvedValue({ status: "empty", reportCards: [] });
    loadStudentHomeworkItems.mockResolvedValue({ status: "empty", assignments: [] });
    loadLearnerAttendancePortal.mockResolvedValue({ portal: null });
    loadLearnerTimetable.mockResolvedValue({ status: "empty", schedule: {} });
    listStudentRemarks.mockResolvedValue([]);
    loadConnectPortalInbox.mockResolvedValue([{ id: "n1", title: "Hi", unread: true }]);
  });

  it("does not fetch inbox when a shared inbox payload is provided", async () => {
    const { loadParentPortalSnapshotFromApi } = await import("./load-parent-dashboard");
    const shared = [{ id: "shared", title: "Shared", unread: false }] as never;
    const snap = await loadParentPortalSnapshotFromApi({
      instituteId: INST,
      studentId: CHILD,
      inbox: shared,
    });
    expect(loadConnectPortalInbox).not.toHaveBeenCalled();
    expect(snap.notifications).toEqual(shared);
  });

  it("fetches inbox when none is provided", async () => {
    const { loadParentPortalSnapshotFromApi } = await import("./load-parent-dashboard");
    const snap = await loadParentPortalSnapshotFromApi({
      instituteId: INST,
      studentId: CHILD,
    });
    expect(loadConnectPortalInbox).toHaveBeenCalledTimes(1);
    expect(snap.notifications).toHaveLength(1);
  });
});
