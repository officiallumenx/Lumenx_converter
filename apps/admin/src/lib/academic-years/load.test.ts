import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { AcademicYearDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AcademicYearDto> = {}): AcademicYearDto {
  return {
    id: "yy111111-1111-4111-8111-111111111111",
    instituteId: INST,
    name: "2026-2027",
    code: "AY2627",
    startsOn: "2026-04-01",
    endsOn: "2027-03-31",
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadAcademicYearsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAcademicYears = vi.fn();
    vi.doMock("./api", () => ({ listAcademicYears }));
    const { loadAcademicYearsList } = await import("./load");
    const result = await loadAcademicYearsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listAcademicYears).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAcademicYears = vi.fn();
    vi.doMock("./api", () => ({ listAcademicYears }));
    const { loadAcademicYearsList } = await import("./load");
    await expect(loadAcademicYearsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listAcademicYears).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAcademicYears = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listAcademicYears }));
    const { loadAcademicYearsList } = await import("./load");
    const result = await loadAcademicYearsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items[0]?.label).toBe("2026-2027");
    expect(listAcademicYears).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAcademicYears = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listAcademicYears }));
    const { loadAcademicYearsList } = await import("./load");
    await expect(loadAcademicYearsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAcademicYears = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listAcademicYears }));
    const { loadAcademicYearsList } = await import("./load");
    const result = await loadAcademicYearsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAcademicYears = vi.fn().mockResolvedValue({ not: "array" });
    vi.doMock("./api", () => ({ listAcademicYears }));
    const { loadAcademicYearsList } = await import("./load");
    const result = await loadAcademicYearsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
