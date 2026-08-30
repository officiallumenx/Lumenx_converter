import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { TeacherAssignmentDto, TimetableSlotDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECTION = "ff111111-1111-4111-8111-111111111111";

describe("timetable api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses list in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listTimetableSlots } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listTimetableSlots({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTimetableSlots, listTeacherAssignments } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listTimetableSlots({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    await expect(
      listTeacherAssignments({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
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
        sectionId: SECTION,
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

  it("lists teacher assignments for slot pickers", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTeacherAssignments } = await import("./api");
    const payload: TeacherAssignmentDto[] = [
      {
        id: "aa111111-1111-4111-8111-111111111111",
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        classId: "dd111111-1111-4111-8111-111111111111",
        sectionId: SECTION,
        subjectId: "bb111111-1111-4111-8111-111111111111",
        teacherId: "ee111111-1111-4111-8111-111111111111",
        status: "active",
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
    const result = await listTeacherAssignments(
      { instituteId: INST, sectionId: SECTION, status: "active" },
      client,
    );
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/timetable/assignments?");
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain(`section_id=${SECTION}`);
    expect(url).toContain("status=active");
  });
});
