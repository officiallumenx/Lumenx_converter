import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DAY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TEACHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("diary mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createDiaryDay } = await import("./mutations");
    await expect(
      createDiaryDay({
        instituteId: INST,
        diaryDate: "2026-08-29",
        scope: "subject",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid diary UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteDiaryDay } = await import("./mutations");
    await expect(deleteDiaryDay("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload with teacher_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: DAY });
    const client = { post } as never;
    const { createDiaryDay } = await import("./mutations");
    await createDiaryDay(
      {
        instituteId: INST,
        teacherId: TEACHER,
        diaryDate: "2026-08-29",
        scope: "activity",
        rows: [{ classLabel: "10-A", description: "Sports" }],
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/diary",
      expect.objectContaining({
        institute_id: INST,
        teacher_id: TEACHER,
        diary_date: "2026-08-29",
        scope: "activity",
      }),
    );
  });

  it("patches update payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: DAY });
    const client = { patch } as never;
    const { updateDiaryDay } = await import("./mutations");
    await updateDiaryDay(
      DAY,
      {
        rows: [
          {
            sectionId: null,
            classLabel: "10-A",
            description: "Updated",
            sortOrder: 0,
          },
        ],
      },
      client,
    );
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/diary/${DAY}`,
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            class_label: "10-A",
            description: "Updated",
          }),
        ],
      }),
    );
  });

  it("rejects empty update payload without calling network", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn();
    const client = { patch } as never;
    const { updateDiaryDay } = await import("./mutations");
    await expect(updateDiaryDay(DAY, {}, client)).rejects.toThrow(
      /At least one field/,
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("posts submit in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: DAY });
    const client = { post } as never;
    const { submitDiaryDay } = await import("./mutations");
    await submitDiaryDay(DAY, client);
    expect(post).toHaveBeenCalledWith(`/api/v1/diary/${DAY}/submit`);
  });

  it("deletes diary day in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn().mockResolvedValue(undefined);
    const client = { delete: del } as never;
    const { deleteDiaryDay } = await import("./mutations");
    await deleteDiaryDay(DAY, client);
    expect(del).toHaveBeenCalledWith(`/api/v1/diary/${DAY}`);
  });
});
