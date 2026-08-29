import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EVENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("events mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createEvent } = await import("./mutations");
    await expect(
      createEvent({
        instituteId: INST,
        title: "Holiday",
        kind: "holiday",
        source: "calendar",
        startsOn: "2026-10-02",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid event UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteEvent } = await import("./mutations");
    await expect(deleteEvent("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: EVENT });
    const client = { post } as never;
    const { createEvent } = await import("./mutations");
    await createEvent(
      {
        instituteId: INST,
        title: "Annual Day",
        kind: "function",
        source: "events",
        startsOn: "2026-12-15",
        published: false,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/events",
      expect.objectContaining({
        institute_id: INST,
        source: "events",
        kind: "function",
      }),
    );
  });

  it("posts cancel with reason in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: EVENT });
    const client = { post } as never;
    const { cancelEvent } = await import("./mutations");
    await cancelEvent(EVENT, { cancellationReason: "Rain" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/events/${EVENT}/cancel`,
      expect.objectContaining({ cancellation_reason: "Rain" }),
    );
  });
});
