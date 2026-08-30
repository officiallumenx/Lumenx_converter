import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { ExamDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ExamDto> = {}): ExamDto {
  return {
    id: "ee111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    name: "Mid-Term Examination",
    header: "Mid-Term 2026",
    startDate: "2026-09-01",
    endDate: "2026-09-15",
    defaultStartsAt: "09:00:00",
    defaultEndsAt: "12:00:00",
    totalMarks: 100,
    internalMarks: 20,
    externalMarks: 80,
    audienceScope: "year",
    scheduleStatus: "published",
    lifecycleStatus: "open",
    schedulePublishedAt: "2026-08-20T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    targetSections: [],
    subjectSchedules: [
      {
        id: "ss111111-1111-4111-8111-111111111111",
        subjectId: "subj-math",
        paperDate: "2026-09-01",
        startsAt: "09:00:00",
        endsAt: "12:00:00",
        room: "Hall A",
        invigilatorTeacherId: null,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("exams api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listExams } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listExams({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists exams with institute_id only in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listExams } = await import("./api");
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
    const result = await listExams({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain("/api/v1/exams?");
  });

  it("gets exam by id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getExam } = await import("./api");
    const exam = dto();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: exam }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await getExam(exam.id, client);
    expect(result.id).toBe(exam.id);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.test/api/v1/exams/${exam.id}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
});
