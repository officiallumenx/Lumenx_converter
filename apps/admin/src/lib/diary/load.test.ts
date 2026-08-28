import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { DiaryDayDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<DiaryDayDto> = {}): DiaryDayDto {
  return {
    id: "diary-1",
    instituteId: INST,
    academicYearId: null,
    teacherId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    diaryDate: "2026-06-01",
    scope: "subject",
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    rows: [],
    ...overrides,
  };
}

describe("loadDiaryDaysList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listDiaryDays = vi.fn();
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    const result = await loadDiaryDaysList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listDiaryDays).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn();
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    await expect(loadDiaryDaysList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadDiaryDaysList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listDiaryDays).not.toHaveBeenCalled();
  });

  it("maps successful API list with submitted=true and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    const result = await loadDiaryDaysList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("diary-1");
    expect(listDiaryDays).toHaveBeenCalledWith({
      instituteId: INST,
      submitted: true,
    });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    await expect(loadDiaryDaysList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    const result = await loadDiaryDaysList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    const result = await loadDiaryDaysList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    const result = await loadDiaryDaysList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listDiaryDays = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listDiaryDays }));
    const { loadDiaryDaysList } = await import("./load");
    const result = await loadDiaryDaysList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
