import { beforeEach, describe, expect, it, vi } from "vitest";

const listStudents = vi.fn();
const getStudentHomeworkItems = vi.fn();

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

vi.mock("@/lib/students/api", () => ({
  listStudents: (...args: unknown[]) => listStudents(...args),
}));

vi.mock("./api", () => ({
  getStudentHomeworkItems: (...args: unknown[]) => getStudentHomeworkItems(...args),
  getAssetSignedUrl: vi.fn(),
  getTeacherHomeworkSheet: vi.fn(),
  listHomework: vi.fn(),
}));

describe("loadParentHomeworkItems linked-child scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listStudents.mockResolvedValue([
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "A" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "B" },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "C" },
    ]);
    getStudentHomeworkItems.mockResolvedValue([]);
  });

  it("fetches homework only for linked studentIds when provided", async () => {
    const { loadParentHomeworkItems } = await import("./load");
    const result = await loadParentHomeworkItems({
      instituteId: "11111111-1111-4111-8111-111111111111",
      studentIds: [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ],
    });

    expect(result.students).toHaveLength(2);
    expect(getStudentHomeworkItems).toHaveBeenCalledTimes(2);
    expect(getStudentHomeworkItems).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    );
    expect(getStudentHomeworkItems).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    );
  });

  it("ignores aborted loads without treating them as a homework error UI path", async () => {
    const { loadParentHomeworkItems } = await import("./load");
    const ac = new AbortController();
    ac.abort();
    const result = await loadParentHomeworkItems({
      instituteId: "11111111-1111-4111-8111-111111111111",
      signal: ac.signal,
    });
    expect(result.errorMessage).toBe("Aborted");
    expect(listStudents).not.toHaveBeenCalled();
  });
});
