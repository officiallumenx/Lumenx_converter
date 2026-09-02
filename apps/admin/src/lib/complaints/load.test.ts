import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { ComplaintDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ComplaintDto> = {}): ComplaintDto {
  return {
    id: "cmp-1",
    instituteId: INST,
    title: "HVAC issue",
    body: "Block B too warm",
    category: "Parent",
    priority: "medium",
    status: "pending",
    destination: "class_teacher",
    requestedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    studentId: null,
    teacherId: null,
    responseNote: null,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadComplaintsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listComplaints = vi.fn();
    vi.doMock("./api", () => ({ listComplaints }));
    const { loadComplaintsList } = await import("./load");
    const result = await loadComplaintsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listComplaints).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listComplaints = vi.fn();
    vi.doMock("./api", () => ({ listComplaints }));
    const { loadComplaintsList } = await import("./load");
    await expect(loadComplaintsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadComplaintsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listComplaints).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listComplaints = vi.fn().mockResolvedValue([dto()]);
    const listStudents = vi.fn().mockResolvedValue([]);
    const listTeachers = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listComplaints }));
    vi.doMock("@/lib/students/api", () => ({ listStudents }));
    vi.doMock("@/lib/teachers/api", () => ({ listTeachers }));
    const { loadComplaintsList } = await import("./load");
    const result = await loadComplaintsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("cmp-1");
    expect(listComplaints).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listComplaints = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listComplaints }));
    const { loadComplaintsList } = await import("./load");
    await expect(loadComplaintsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listComplaints = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listComplaints }));
    const { loadComplaintsList } = await import("./load");
    const result = await loadComplaintsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listComplaints = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listComplaints }));
    const { loadComplaintsList } = await import("./load");
    const result = await loadComplaintsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listComplaints = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listComplaints }));
    const { loadComplaintsList } = await import("./load");
    const result = await loadComplaintsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
