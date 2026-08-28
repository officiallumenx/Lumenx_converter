import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { MarkEntryDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<MarkEntryDto> = {}): MarkEntryDto {
  return {
    id: "mm111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    classId: "cc111111-1111-4111-8111-111111111111",
    sectionId: "ss111111-1111-4111-8111-111111111111",
    examId: "ee111111-1111-4111-8111-111111111111",
    subjectId: "subj-math-1111-4111-8111-111111111111",
    teacherId: "tt111111-1111-4111-8111-111111111111",
    maxMarks: 100,
    status: "submitted",
    submittedAt: "2026-06-01T10:00:00Z",
    publishedAt: null,
    adminNote: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("marks api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listMarkEntries } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listMarkEntries({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists mark entries with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listMarkEntries } = await import("./api");
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
    const result = await listMarkEntries({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain("/api/v1/marks/entries?");
  });
});
