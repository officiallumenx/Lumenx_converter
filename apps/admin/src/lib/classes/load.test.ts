import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { ClassDto, SectionDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function sectionDto(overrides: Partial<SectionDto> = {}): SectionDto {
  return {
    id: "ss111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    classId: "cc111111-1111-4111-8111-111111111111",
    name: "Section A",
    code: "A",
    capacity: 40,
    room: "Block A-101",
    sortOrder: 1,
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

function classDto(overrides: Partial<ClassDto> = {}): ClassDto {
  return {
    id: "cc111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    name: "Grade 10",
    code: "G10",
    sortOrder: 1,
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadClassesList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listClassesCatalog = vi.fn();
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    const result = await loadClassesList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listClassesCatalog).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listClassesCatalog = vi.fn();
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    await expect(loadClassesList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadClassesList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listClassesCatalog).not.toHaveBeenCalled();
  });

  it("maps successful API catalog and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listClassesCatalog = vi.fn().mockResolvedValue({
      sections: [sectionDto()],
      classes: [classDto()],
    });
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    const result = await loadClassesList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Grade 10 · Sec A");
    expect(listClassesCatalog).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no sections", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listClassesCatalog = vi.fn().mockResolvedValue({
      sections: [],
      classes: [classDto()],
    });
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    await expect(loadClassesList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listClassesCatalog = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    const result = await loadClassesList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listClassesCatalog = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    const result = await loadClassesList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listClassesCatalog = vi.fn().mockResolvedValue({
      sections: { not: "array" },
      classes: [],
    });
    vi.doMock("./api", () => ({ listClassesCatalog }));
    const { loadClassesList } = await import("./load");
    const result = await loadClassesList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});

describe("loadSectionDetail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getSection = vi.fn();
    vi.doMock("./api", () => ({ getSection, getClass: vi.fn() }));
    const { loadSectionDetail } = await import("./load");
    const result = await loadSectionDetail("sec-1");
    expect(result.status).toBe("demo");
    expect(getSection).not.toHaveBeenCalled();
  });
});
