import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("students mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createStudent } = await import("./mutations");
    await expect(
      createStudent({
        instituteId: INST,
        firstName: "A",
        surname: "B",
        gender: "female",
        address: "Addr",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid student UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteStudent } = await import("./mutations");
    await expect(deleteStudent("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: STUDENT });
    const client = { post } as never;
    const { createStudent } = await import("./mutations");
    await createStudent(
      {
        instituteId: INST,
        firstName: "Aanya",
        surname: "Sharma",
        gender: "female",
        address: "Hyderabad",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/students",
      expect.objectContaining({
        institute_id: INST,
        first_name: "Aanya",
        surname: "Sharma",
      }),
    );
  });
});
