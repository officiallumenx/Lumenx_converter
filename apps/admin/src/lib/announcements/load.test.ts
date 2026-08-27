import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { AnnouncementDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AnnouncementDto> = {}): AnnouncementDto {
  return {
    id: "ann-1",
    instituteId: INST,
    title: "Exam guidelines",
    body: null,
    audienceScope: "all",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    status: "published",
    scheduledAt: null,
    publishedAt: "2026-08-01T10:00:00Z",
    archivedAt: null,
    pinned: false,
    pinUntil: null,
    views: 10,
    createdByUserId: "user-1",
    createdAt: "2026-08-01T09:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadAnnouncementsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAnnouncements = vi.fn();
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");
    const result = await loadAnnouncementsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listAnnouncements).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAnnouncements = vi.fn();
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");

    await expect(loadAnnouncementsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadAnnouncementsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listAnnouncements).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAnnouncements = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");
    const result = await loadAnnouncementsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Exam guidelines");
    expect(result.items[0]?.id).toBe("ann-1");
    expect(listAnnouncements).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAnnouncements = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");
    const result = await loadAnnouncementsList(INST);
    expect(result).toEqual({ status: "empty", items: [], errorMessage: null });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAnnouncements = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");
    const result = await loadAnnouncementsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
    expect(result.errorMessage).toMatch(/No access/);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAnnouncements = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");
    const result = await loadAnnouncementsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
    expect(result.errorMessage).toMatch(/Authentication required/);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAnnouncements = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listAnnouncements }));
    const { loadAnnouncementsList } = await import("./load");
    const result = await loadAnnouncementsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
    expect(result.errorMessage).toMatch(/Network/);
  });
});
