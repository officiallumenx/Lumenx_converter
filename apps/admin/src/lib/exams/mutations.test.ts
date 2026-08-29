import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EXAM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("exams mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createExam } = await import("./mutations");
    await expect(
      createExam({
        instituteId: INST,
        academicYearId: YEAR,
        name: "Midterm",
        header: "Midterm",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        defaultStartsAt: "09:00",
        defaultEndsAt: "12:00",
        totalMarks: 100,
        audienceScope: "year",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid exam UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteExam } = await import("./mutations");
    await expect(deleteExam("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: EXAM });
    const client = { post } as never;
    const { createExam } = await import("./mutations");
    await createExam(
      {
        instituteId: INST,
        academicYearId: YEAR,
        name: "Midterm",
        header: "Midterm · 2026",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        defaultStartsAt: "09:00",
        defaultEndsAt: "12:00",
        totalMarks: 100,
        audienceScope: "year",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/exams",
      expect.objectContaining({
        institute_id: INST,
        name: "Midterm",
        audience_scope: "year",
      }),
    );
  });

  it("patches schedule_status in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: EXAM });
    const client = { patch } as never;
    const { updateExam } = await import("./mutations");
    await updateExam(EXAM, { scheduleStatus: "published" }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/exams/${EXAM}`,
      expect.objectContaining({ schedule_status: "published" }),
    );
  });
});
