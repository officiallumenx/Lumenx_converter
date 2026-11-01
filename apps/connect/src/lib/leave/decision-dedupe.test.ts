import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const listLeaveRequests = vi.fn();
const listStudents = vi.fn();

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

vi.mock("@/lib/connect-api", () => ({
  getConnectApiClient: () => ({
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
  }),
}));

vi.mock("@/lib/students/api", () => ({
  listStudents: (...args: unknown[]) => listStudents(...args),
}));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    listLeaveRequests: (...args: unknown[]) => listLeaveRequests(...args),
  };
});

describe("leave decision request dedupe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listStudents.mockResolvedValue([]);
    getMock.mockImplementation(async (path: string) => {
      await new Promise((r) => setTimeout(r, 20));
      return {
        id: "dec-1",
        instituteId: "11111111-1111-4111-8111-111111111111",
        leaveRequestId: String(path).split("/")[5],
        outcome: "approved",
        note: "ok",
        decidedByUserId: "u1",
        decidedAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
    });
  });

  it("coalesces concurrent getLeaveDecision calls for the same leave id", async () => {
    const { getLeaveDecision, __clearLeaveDecisionInflightForTests } = await import("./api");
    __clearLeaveDecisionInflightForTests();
    const leaveId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const [a, b] = await Promise.all([
      getLeaveDecision(leaveId),
      getLeaveDecision(leaveId),
    ]);
    expect(a.leaveRequestId).toBe(leaveId);
    expect(b.leaveRequestId).toBe(leaveId);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("skips /decision GETs when includeDecisions is false (Home/Sync path)", async () => {
    listLeaveRequests.mockResolvedValue([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        instituteId: "11111111-1111-4111-8111-111111111111",
        subjectKind: "student",
        studentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        teacherId: null,
        requestedByUserId: "u1",
        leaveType: "sick",
        intendedApproverRole: null,
        startDate: "2026-01-01",
        endDate: "2026-01-02",
        reason: "fever",
        status: "approved",
        academicYearId: null,
        classId: null,
        sectionId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    const { loadTeacherLeavePortal } = await import("./load");
    const { __clearLeaveDecisionInflightForTests } = await import("./api");
    __clearLeaveDecisionInflightForTests();
    getMock.mockClear();

    await loadTeacherLeavePortal({
      instituteId: "11111111-1111-4111-8111-111111111111",
      teacherId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      includeDecisions: false,
    });
    expect(getMock).not.toHaveBeenCalled();

    await loadTeacherLeavePortal({
      instituteId: "11111111-1111-4111-8111-111111111111",
      teacherId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      includeDecisions: true,
    });
    expect(getMock).toHaveBeenCalled();
    expect(String(getMock.mock.calls[0]?.[0] ?? "")).toContain("/decision");
  });
});
