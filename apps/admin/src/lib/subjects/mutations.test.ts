import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUBJECT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("subjects mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createSubject } = await import("./mutations");
    await expect(
      createSubject({
        instituteId: INST,
        name: "Math",
        code: "MATH",
        category: "Core",
        periodsPerWeek: 5,
        applicableClassCodes: ["G10"],
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid subject UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteSubject } = await import("./mutations");
    await expect(deleteSubject("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: SUBJECT });
    const client = { post } as never;
    const { createSubject } = await import("./mutations");
    await createSubject(
      {
        instituteId: INST,
        name: "Mathematics",
        code: "MATH",
        category: "Core",
        periodsPerWeek: 6,
        applicableClassCodes: ["G10", "G11"],
        status: "active",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/subjects",
      expect.objectContaining({
        institute_id: INST,
        name: "Mathematics",
        code: "MATH",
        periods_per_week: 6,
        applicable_class_codes: ["G10", "G11"],
      }),
    );
  });

  it("patches subject in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: SUBJECT });
    const client = { patch } as never;
    const { updateSubject } = await import("./mutations");
    await updateSubject(SUBJECT, { status: "draft" }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/subjects/${SUBJECT}`,
      expect.objectContaining({ status: "draft" }),
    );
  });
});
