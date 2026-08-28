import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { InboxItemDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<InboxItemDto> = {}): InboxItemDto {
  return {
    id: "inbox-1",
    instituteId: INST,
    notificationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    userProfileId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    readAt: null,
    starredAt: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    notification: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      category: "fees",
      priority: "normal",
      title: "Fee reminder",
      body: "Term 2 balance pending",
      payload: {},
      deepLink: null,
      templateId: null,
      createdAt: "2026-06-01T09:00:00Z",
    },
    ...overrides,
  };
}

describe("loadNotificationInboxList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listInboxNotifications = vi.fn();
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    const result = await loadNotificationInboxList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listInboxNotifications).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn();
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    await expect(loadNotificationInboxList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadNotificationInboxList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listInboxNotifications).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    const result = await loadNotificationInboxList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("inbox-1");
    expect(listInboxNotifications).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    await expect(loadNotificationInboxList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    const result = await loadNotificationInboxList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    const result = await loadNotificationInboxList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    const result = await loadNotificationInboxList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInboxNotifications = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listInboxNotifications }));
    const { loadNotificationInboxList } = await import("./load");
    const result = await loadNotificationInboxList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
