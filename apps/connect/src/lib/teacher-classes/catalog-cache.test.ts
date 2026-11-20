import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();

vi.mock("@/lib/connect-api", () => ({
  getConnectApiClient: () => ({ get }),
}));

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

describe("teacher catalog TTL cache", () => {
  beforeEach(async () => {
    vi.resetModules();
    get.mockReset();
    const { clearTeacherCatalogCache } = await import("./api");
    clearTeacherCatalogCache();
  });

  it("reuses listSubjects / listTeacherAssignments within TTL", async () => {
    get.mockResolvedValue([{ id: "s1", name: "Math", code: "M", instituteId: "i", status: "active" }]);
    const { listSubjects, listTeacherAssignments } = await import("./api");
    const instituteId = "11111111-1111-4111-8111-111111111111";
    const teacherId = "22222222-2222-4222-8222-222222222222";

    await listSubjects(instituteId);
    await listSubjects(instituteId);
    expect(get).toHaveBeenCalledTimes(1);

    get.mockResolvedValue([{ id: "a1", sectionId: "sec", classId: "c", subjectId: "s", teacherId, instituteId, academicYearId: "y", status: "active" }]);
    await listTeacherAssignments({ instituteId, teacherId });
    await listTeacherAssignments({ instituteId, teacherId });
    expect(get).toHaveBeenCalledTimes(2);
  });
});
