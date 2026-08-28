import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { TimetableSlotDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("timetable api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists timetable slots with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTimetableSlots } = await import("./api");
    const payload: TimetableSlotDto[] = [
      {
        id: "ee111111-1111-4111-8111-111111111111",
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        classId: "dd111111-1111-4111-8111-111111111111",
        sectionId: "ff111111-1111-4111-8111-111111111111",
        teacherAssignmentId: "aa111111-1111-4111-8111-111111111111",
        dayOfWeek: 1,
        periodIndex: 1,
        startsAt: "09:00:00",
        endsAt: "09:45:00",
        room: "101",
        status: "active",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
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
    const result = await listTimetableSlots({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/timetable?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
