import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { AuditEventDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AuditEventDto> = {}): AuditEventDto {
  return {
    id: "aud-1",
    scope: "institute",
    instituteId: INST,
    actorUserId: null,
    action: "Updated settings",
    entityType: "settings",
    entityId: "profile",
    metadata: {},
    createdAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadInstituteAuditList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listInstituteAudit = vi.fn();
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    const result = await loadInstituteAuditList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listInstituteAudit).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInstituteAudit = vi.fn();
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    await expect(loadInstituteAuditList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadInstituteAuditList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listInstituteAudit).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo seed rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInstituteAudit = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    const result = await loadInstituteAuditList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("aud-1");
    expect(result.items[0]?.id).not.toMatch(/^AUD-1001$/);
    expect(listInstituteAudit).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInstituteAudit = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    await expect(loadInstituteAuditList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInstituteAudit = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    const result = await loadInstituteAuditList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInstituteAudit = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    const result = await loadInstituteAuditList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listInstituteAudit = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listInstituteAudit }));
    const { loadInstituteAuditList } = await import("./load");
    const result = await loadInstituteAuditList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
