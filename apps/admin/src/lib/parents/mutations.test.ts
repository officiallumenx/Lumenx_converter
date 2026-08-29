import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STUDENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LINK = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("parents mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createParent } = await import("./mutations");
    await expect(
      createParent({
        instituteId: INST,
        name: "Maya",
        phone: "9876543210",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid parent UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteParent } = await import("./mutations");
    await expect(deleteParent("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: PARENT });
    const client = { post } as never;
    const { createParent } = await import("./mutations");
    await createParent(
      {
        instituteId: INST,
        name: "Maya Robinson",
        phone: "9876543210",
        email: "maya@example.com",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/parents",
      expect.objectContaining({
        institute_id: INST,
        name: "Maya Robinson",
        phone: "9876543210",
        email: "maya@example.com",
      }),
    );
  });

  it("patches update and posts guardian link", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: PARENT });
    const post = vi.fn().mockResolvedValue({ id: LINK });
    const client = { patch, post } as never;
    const { updateParent, createParentLink } = await import("./mutations");
    await updateParent(PARENT, { accessStatus: "hold" }, client);
    expect(patch).toHaveBeenCalledWith(`/api/v1/parents/${PARENT}`, {
      access_status: "hold",
    });
    await createParentLink(
      PARENT,
      { studentId: STUDENT, relationship: "mother" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      `/api/v1/parents/${PARENT}/links`,
      expect.objectContaining({
        student_id: STUDENT,
        relationship: "mother",
      }),
    );
  });
});
