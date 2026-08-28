import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { AttendanceRegisterDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("attendance api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists attendance registers with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listAttendanceRegisters } = await import("./api");
    const payload: AttendanceRegisterDto[] = [
      {
        id: "ee111111-1111-4111-8111-111111111111",
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        classId: "dd111111-1111-4111-8111-111111111111",
        sectionId: "ff111111-1111-4111-8111-111111111111",
        configVersionId: "aa111111-1111-4111-8111-111111111111",
        method: "daily",
        owner: "class_teacher",
        attendanceDate: "2026-06-01",
        slotKind: "day",
        slotCode: "day",
        periodIndex: null,
        timetableSlotId: null,
        slotLabel: "Full day",
        subjectLabel: null,
        startsAt: null,
        endsAt: null,
        status: "submitted",
        markedByTeacherId: null,
        submittedAt: "2026-06-01T10:00:00Z",
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
    const result = await listAttendanceRegisters({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/attendance/registers?");
    expect(url).toContain(`institute_id=${INST}`);
  });

  it("gets attendance register by id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getAttendanceRegister } = await import("./api");
    const registerId = "ee111111-1111-4111-8111-111111111111";
    const payload: AttendanceRegisterDto = {
      id: registerId,
      instituteId: INST,
      academicYearId: "cc111111-1111-4111-8111-111111111111",
      classId: "dd111111-1111-4111-8111-111111111111",
      sectionId: "ff111111-1111-4111-8111-111111111111",
      configVersionId: "aa111111-1111-4111-8111-111111111111",
      method: "daily",
      owner: "class_teacher",
      attendanceDate: "2026-06-01",
      slotKind: "day",
      slotCode: "day",
      periodIndex: null,
      timetableSlotId: null,
      slotLabel: "Full day",
      subjectLabel: null,
      startsAt: null,
      endsAt: null,
      status: "submitted",
      markedByTeacherId: null,
      submittedAt: "2026-06-01T10:00:00Z",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };
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
    const result = await getAttendanceRegister(registerId, client);
    expect(result.id).toBe(registerId);
    expect(fetchMock.mock.calls[0][0]).toContain(
      `/api/v1/attendance/registers/${registerId}`,
    );
  });

  it("rejects non-UUID register ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getAttendanceRegister } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(getAttendanceRegister("reg-1", client)).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
