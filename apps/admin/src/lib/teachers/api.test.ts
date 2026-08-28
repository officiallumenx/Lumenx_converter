import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { TeacherDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<TeacherDto> = {}): TeacherDto {
  return {
    id: "bb111111-1111-4111-8111-111111111111",
    instituteId: INST,
    userProfileId: null,
    legacyCode: "T-001",
    employeeId: "EMP-1041",
    displayName: "Sarah Jenkins",
    phone: "+1 555 010 2201",
    email: "s.jenkins@institute.edu",
    department: "Mathematics",
    qualification: "M.Sc Mathematics · B.Ed",
    dateOfBirth: "1985-08-18",
    joinedOn: "2019-08-01",
    teachingScope: "subject_teacher",
    portalAccessLevel: "faculty_grading",
    status: "active",
    subjects: ["Mathematics", "Algebra"],
    assignedSectionLabels: ["10-A", "10-B", "11-A"],
    sourceCareerApplicationId: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("teachers api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listTeachers } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listTeachers({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTeachers } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listTeachers({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists teachers with institute_id only in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTeachers } = await import("./api");
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
    const result = await listTeachers({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).not.toContain("status=");
    expect(url).not.toContain("teaching_scope=");
    expect(url).not.toContain("q=");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/teachers?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("unwraps response envelope via shared client", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTeachers } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [dto({ id: "bb222222-2222-4222-8222-222222222222" })],
        }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listTeachers({ instituteId: INST }, client);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("bb222222-2222-4222-8222-222222222222");
  });
});
