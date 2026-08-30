import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { EnrollmentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECTION = "ce111111-1111-4111-8111-111111111111";
const YEAR = "cc111111-1111-4111-8111-111111111111";
const CLASS = "cd111111-1111-4111-8111-111111111111";
const STUDENT = "ac111111-1111-4111-8111-111111111111";
const ENROLL = "e1111111-1111-4111-8111-111111111111";

function dto(overrides: Partial<EnrollmentDto> = {}): EnrollmentDto {
  return {
    id: ENROLL,
    instituteId: INST,
    academicYearId: YEAR,
    studentId: STUDENT,
    studentName: "Ada Lovelace",
    classId: CLASS,
    sectionId: SECTION,
    rollNo: "1",
    status: "active",
    enrolledOn: "2026-04-01",
    withdrawnOn: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("enrollments api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listEnrollments } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listEnrollments({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listEnrollments } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listEnrollments({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists enrollments with institute_id and section_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listEnrollments } = await import("./api");
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
    const result = await listEnrollments(
      { instituteId: INST, sectionId: SECTION, status: "active" },
      client,
    );
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain(`section_id=${SECTION}`);
    expect(url).toContain("status=active");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/enrollments?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates enrollment in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { createEnrollment } = await import("./api");
    const payload = dto({ rollNo: "12" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await createEnrollment(
      {
        instituteId: INST,
        academicYearId: YEAR,
        studentId: STUDENT,
        classId: CLASS,
        sectionId: SECTION,
        rollNo: "12",
        enrolledOn: "2026-04-15",
      },
      client,
    );
    expect(result.rollNo).toBe("12");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/enrollments"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not call network for invalid enrollment UUID on get", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getEnrollment } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(getEnrollment("not-a-uuid", client)).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
