import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { LeaveRequestDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
  return {
    id: "lv-1",
    instituteId: INST,
    subjectKind: "teacher",
    studentId: null,
    teacherId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    requestedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    leaveType: "casual",
    intendedApproverRole: "institute_admin",
    startDate: "2026-06-01",
    endDate: "2026-06-03",
    reason: "Personal",
    status: "pending",
    academicYearId: null,
    classId: null,
    sectionId: null,
    createdAt: "2026-05-30T10:00:00Z",
    updatedAt: "2026-05-30T10:00:00Z",
    ...overrides,
  };
}

describe("leave api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listLeaveRequests } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listLeaveRequests({ instituteId: INST }, client),
    ).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listLeaveRequests } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listLeaveRequests({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists leave requests with institute_id query in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listLeaveRequests } = await import("./api");
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
    const result = await listLeaveRequests({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.test/api/v1/leave/requests?institute_id=${INST}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("forwards optional filters to the backend", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listLeaveRequests } = await import("./api");
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
    await listLeaveRequests(
      {
        instituteId: INST,
        subjectKind: "teacher",
        status: "pending",
        teacherId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      client,
    );
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain("subject_kind=teacher");
    expect(url).toContain("status=pending");
    expect(url).toContain(
      "teacher_id=cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
  });
});
