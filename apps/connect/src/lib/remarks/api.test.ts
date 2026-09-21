import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapRemarkDtoToStudentRemark,
  mapRemarkDtoToParentCard,
  type StudentRemarkDto,
} from "./api";

const sample: StudentRemarkDto = {
  id: "11111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  studentId: "ac111111-1111-4111-8111-111111111111",
  studentName: "Ada Lovelace",
  authorTeacherId: "bb111111-1111-4111-8111-111111111111",
  authorUserId: "22222222-2222-4222-8222-222222222222",
  authorName: "Ms Teacher",
  type: "academic",
  tone: "good",
  text: "Strong progress in algebra this week.",
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
  visibleTo: ["teacher", "parent", "admin"],
};

describe("remarks map", () => {
  it("maps API dto to teacher StudentRemark", () => {
    const row = mapRemarkDtoToStudentRemark(sample);
    expect(row.id).toBe(sample.id);
    expect(row.studentName).toBe("Ada Lovelace");
    expect(row.authorName).toBe("Ms Teacher");
    expect(row.type).toBe("academic");
    expect(row.tone).toBe("good");
    expect(row.text).toContain("algebra");
    expect(row.visibleTo).toEqual(["teacher", "parent", "admin"]);
  });

  it("maps stored tone to parent badge (not remark category)", () => {
    expect(mapRemarkDtoToParentCard({ ...sample, type: "academic", tone: "bad" }).tone).toBe(
      "warning",
    );
    expect(mapRemarkDtoToParentCard({ ...sample, type: "behaviour", tone: "good" }).tone).toBe(
      "positive",
    );
    expect(mapRemarkDtoToParentCard({ ...sample, type: "academic", tone: "none" }).tone).toBe(
      "neutral",
    );
  });
});

describe("remarks api client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists and creates via /api/v1/remarks", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    const get = vi.fn().mockResolvedValue([sample]);
    const post = vi.fn().mockResolvedValue(sample);
    const patch = vi.fn().mockResolvedValue({ ...sample, text: "Updated remark about algebra skills." });
    vi.doMock("@/lib/connect-api", () => ({
      getConnectApiClient: () => ({ get, post, patch, delete: vi.fn() }),
    }));

    const api = await import("./api");
    const listed = await api.listStudentRemarks({
      instituteId: sample.instituteId,
    });
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/remarks?institute_id="),
    );
    expect(listed).toHaveLength(1);

    await api.createStudentRemark({
      instituteId: sample.instituteId,
      studentId: sample.studentId,
      type: "academic",
      tone: "good",
      text: "Strong progress in algebra this week.",
    });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/remarks",
      expect.objectContaining({
        institute_id: sample.instituteId,
        student_id: sample.studentId,
        type: "academic",
        tone: "good",
      }),
    );

    await api.updateStudentRemark(sample.id, {
      text: "Updated remark about algebra skills.",
      tone: "none",
    });
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/remarks/${sample.id}`,
      expect.objectContaining({
        text: "Updated remark about algebra skills.",
        tone: "none",
      }),
    );
  });
});
