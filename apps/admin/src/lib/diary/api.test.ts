import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { DiaryDayDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DAY = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function dto(overrides: Partial<DiaryDayDto> = {}): DiaryDayDto {
  return {
    id: DAY,
    instituteId: INST,
    academicYearId: null,
    teacherId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    diaryDate: "2026-06-01",
    scope: "subject",
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    rows: [
      {
        id: "row-1",
        sectionId: null,
        classLabel: "10-A",
        description: "Algebra practice",
        sortOrder: 0,
        createdAt: "2026-06-01T09:00:00Z",
        updatedAt: "2026-06-01T09:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("diary api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listDiaryDays } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listDiaryDays({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists diary days with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listDiaryDays } = await import("./api");
    const payload = [dto()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listDiaryDays({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).not.toContain("submitted=");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/diary?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("forwards optional filters including submitted to the backend", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listDiaryDays } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await listDiaryDays(
      {
        instituteId: INST,
        submitted: true,
        scope: "activity",
        teacherId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      client,
    );
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("submitted=true");
    expect(url).toContain("scope=activity");
    expect(url).toContain("teacher_id=cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  });

  it("gets a diary day by id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getDiaryDay } = await import("./api");
    const payload = dto();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await getDiaryDay(payload.id, client);
    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/diary/${payload.id}`),
      expect.objectContaining({ method: "GET" }),
    );
  });
});
