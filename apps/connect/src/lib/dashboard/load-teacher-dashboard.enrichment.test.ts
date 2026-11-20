import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSnapshot, TeacherClass } from "@/lib/teacher/types";

const loadTeacherHomeworkList = vi.fn();
const loadTeacherExamPapers = vi.fn();
const loadConnectEvents = vi.fn();
const loadConnectPortalInbox = vi.fn();
const listMarkEntries = vi.fn();
const listAttendanceRegisters = vi.fn();
const getTeacherHomeworkSheet = vi.fn();

vi.mock("@/lib/homework", () => ({
  loadTeacherHomeworkList: (...args: unknown[]) => loadTeacherHomeworkList(...args),
  getTeacherHomeworkSheet: (...args: unknown[]) => getTeacherHomeworkSheet(...args),
}));

vi.mock("@/lib/exams", () => ({
  loadTeacherExamPapers: (...args: unknown[]) => loadTeacherExamPapers(...args),
  pickUpcomingExamPapers: (papers: unknown[]) => papers,
}));

vi.mock("@/lib/events", () => ({
  loadConnectEvents: (...args: unknown[]) => loadConnectEvents(...args),
  pickUpcomingEvents: (items: unknown[]) => items,
}));

vi.mock("@/lib/connect-inbox/load", () => ({
  loadConnectPortalInbox: (...args: unknown[]) => loadConnectPortalInbox(...args),
}));

vi.mock("@/lib/marks/api", () => ({
  listMarkEntries: (...args: unknown[]) => listMarkEntries(...args),
}));

vi.mock("@/lib/attendance/api", () => ({
  listAttendanceRegisters: (...args: unknown[]) => listAttendanceRegisters(...args),
}));

describe("enrichTeacherDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadTeacherHomeworkList.mockResolvedValue({
      status: "ready",
      items: [
        {
          id: "hw-1",
          title: "Algebra",
          status: "published",
          dueDate: "2099-01-01",
        },
      ],
    });
    loadTeacherExamPapers.mockResolvedValue({ status: "empty", papers: [] });
    loadConnectEvents.mockResolvedValue({ status: "empty", items: [] });
    loadConnectPortalInbox.mockResolvedValue([]);
    listMarkEntries.mockResolvedValue([]);
    listAttendanceRegisters.mockResolvedValue([]);
  });

  it(
    "builds homework widgets from the list payload without per-sheet N+1 fetches",
    async () => {
    const { enrichTeacherDashboardSnapshot } = await import("./load-teacher-dashboard");

    const classes: TeacherClass[] = [
      {
        id: "sec-1",
        className: "10",
        section: "A",
        subject: "Math",
        studentCount: 30,
        isClassTeacher: false,
        attendanceRate: 92,
        homeworkSubmissionRate: 80,
        avgScore: 75,
      },
    ];

    const base = {
      todayClasses: [],
      weekClassCount: 0,
      attendancePending: [],
      attendanceCompleted: [],
      classesRemaining: 0,
      pendingMarks: [],
      pendingHomework: [],
      homeworkOverview: [],
      upcomingExams: [],
      upcomingEvents: [],
      recentNotifications: [],
      announcements: [],
      unreadMessages: 0,
      classPerformance: [],
      studentsNeedingAttention: [],
      recentComplaints: [],
    } satisfies DashboardSnapshot;

    const snap = await enrichTeacherDashboardSnapshot({
      instituteId: "11111111-1111-4111-8111-111111111111",
      teacherId: "22222222-2222-4222-8222-222222222222",
      classes,
      base,
    });

    expect(getTeacherHomeworkSheet).not.toHaveBeenCalled();
    expect(loadTeacherHomeworkList).toHaveBeenCalledTimes(1);
    expect(snap.pendingHomework).toEqual([
      { assignmentId: "hw-1", label: "Algebra", pendingCount: 1 },
    ]);
    expect(snap.homeworkOverview).toEqual([
      { classId: "sec-1", label: "10-A", submissionPct: 80 },
    ]);
  },
  15_000,
  );
});
