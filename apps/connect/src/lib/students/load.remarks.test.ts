import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT = "ac111111-1111-4111-8111-111111111111";

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

const getStudent = vi.fn();
const getStudentGuardians = vi.fn();
const listStudentRemarks = vi.fn();

vi.mock("./api", () => ({
  getStudent: (...args: unknown[]) => getStudent(...args),
  getStudentGuardians: (...args: unknown[]) => getStudentGuardians(...args),
  listStudents: vi.fn(),
}));

vi.mock("@/lib/remarks", () => ({
  listStudentRemarks: (...args: unknown[]) => listStudentRemarks(...args),
  mapRemarkDtoToStudentRemark: (dto: {
    id: string;
    studentId: string;
    studentName: string | null;
    type: string;
    text: string;
    authorTeacherId: string;
    authorName: string | null;
    createdAt: string;
    updatedAt: string;
    visibleTo: Array<"teacher" | "parent" | "admin">;
  }) => ({
    id: dto.id,
    studentId: dto.studentId,
    studentName: dto.studentName ?? "Student",
    type: dto.type,
    text: dto.text,
    authorId: dto.authorTeacherId,
    authorName: dto.authorName ?? "Teacher",
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    visibleTo: dto.visibleTo,
  }),
}));

describe("loadTeacherStudentDetail remarks SoT", () => {
  beforeEach(() => {
    vi.resetModules();
    getStudent.mockReset();
    getStudentGuardians.mockReset();
    listStudentRemarks.mockReset();
  });

  it("loads remarks from /api/v1/remarks and never invents local store data", { timeout: 20_000 }, async () => {
    getStudent.mockResolvedValue({
      id: STUDENT,
      instituteId: INST,
      displayName: "Ada Lovelace",
      firstName: "Ada",
      surname: "Lovelace",
      rollNo: "1",
      classLabel: "10",
      sectionLabel: "A",
    });
    getStudentGuardians.mockResolvedValue([]);
    listStudentRemarks.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        instituteId: INST,
        studentId: STUDENT,
        studentName: "Ada Lovelace",
        authorTeacherId: "bb111111-1111-4111-8111-111111111111",
        authorUserId: "22222222-2222-4222-8222-222222222222",
        authorName: "Ms Teacher",
        type: "academic",
        text: "Strong progress in algebra this week.",
        createdAt: "2026-09-10T10:00:00.000Z",
        updatedAt: "2026-09-10T10:00:00.000Z",
        visibleTo: ["teacher", "parent", "admin"],
      },
    ]);

    const { loadTeacherStudentDetail } = await import("./load");
    const result = await loadTeacherStudentDetail({
      instituteId: INST,
      studentId: STUDENT,
    });

    expect(result.status).toBe("ready");
    expect(listStudentRemarks).toHaveBeenCalledWith({
      instituteId: INST,
      studentId: STUDENT,
    });
    expect(result.detail?.remarks).toHaveLength(1);
    expect(result.detail?.remarks[0]?.text).toContain("algebra");
  });

  it("returns empty remarks when remarks API fails (no local fallback)", async () => {
    getStudent.mockResolvedValue({
      id: STUDENT,
      instituteId: INST,
      displayName: "Ada Lovelace",
      firstName: "Ada",
      surname: "Lovelace",
      rollNo: "1",
      classLabel: "10",
      sectionLabel: "A",
    });
    getStudentGuardians.mockResolvedValue([]);
    listStudentRemarks.mockRejectedValue(new Error("network"));

    const { loadTeacherStudentDetail } = await import("./load");
    const result = await loadTeacherStudentDetail({
      instituteId: INST,
      studentId: STUDENT,
    });

    expect(result.status).toBe("ready");
    expect(result.detail?.remarks).toEqual([]);
  });
});
