import { beforeEach, describe, expect, it, vi } from "vitest";

const ITEM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("notification-inbox mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses update in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { updateInboxItem } = await import("./mutations");
    await expect(
      updateInboxItem(ITEM, { read: true }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid item UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteInboxItem } = await import("./mutations");
    await expect(deleteInboxItem("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("patches read flag in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: ITEM });
    const client = { patch } as never;
    const { updateInboxItem } = await import("./mutations");
    await updateInboxItem(ITEM, { read: true }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/notifications/${ITEM}`,
      expect.objectContaining({ read: true }),
    );
  });

  it("posts emit payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ITEM });
    const client = { post } as never;
    const { emitNotification } = await import("./mutations");
    await emitNotification(
      {
        instituteId: INST,
        category: "system",
        title: "Hello",
        body: "World",
        recipientUserIds: [USER],
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/notifications",
      expect.objectContaining({
        institute_id: INST,
        title: "Hello",
        recipient_user_ids: [USER],
      }),
    );
  });

  it("posts audience emit without recipient_user_ids", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue([]);
    const client = { post } as never;
    const { emitNotification } = await import("./mutations");
    await emitNotification(
      {
        instituteId: INST,
        category: "announcements",
        title: "Hello",
        body: "World",
        audience: "students",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/notifications",
      expect.objectContaining({
        institute_id: INST,
        audience: "students",
      }),
    );
    const payload = post.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.recipient_user_ids).toBeUndefined();
  });

  it("rejects emit with neither audience nor recipients", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { emitNotification } = await import("./mutations");
    await expect(
      emitNotification(
        {
          instituteId: INST,
          category: "system",
          title: "Hello",
          body: "World",
        },
        client,
      ),
    ).rejects.toThrow(/audience/);
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects emit with invalid recipient UUID without network", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { emitNotification } = await import("./mutations");
    await expect(
      emitNotification(
        {
          instituteId: INST,
          category: "system",
          title: "Hello",
          body: "World",
          recipientUserIds: ["not-a-uuid"],
        },
        client,
      ),
    ).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("refuses emit in demo mode (no demo fallback)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { emitNotification } = await import("./mutations");
    await expect(
      emitNotification({
        instituteId: INST,
        category: "system",
        title: "Hello",
        body: "World",
        audience: "everyone",
      }),
    ).rejects.toThrow(/API auth mode/);
  });
});
