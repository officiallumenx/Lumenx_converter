import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { AdmissionApplicationDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AdmissionApplicationDto> = {}): AdmissionApplicationDto {
  return {
    id: "aa111111-1111-4111-8111-111111111111",
    instituteId: INST,
    openingId: "oo111111-1111-4111-8111-111111111111",
    programId: "pp111111-1111-4111-8111-111111111111",
    applicantUserId: "uu111111-1111-4111-8111-111111111111",
    studentDisplayName: "Aarav Sharma",
    status: "review",
    payload: { grade: "Grade 10" },
    decisionNote: null,
    convertedStudentId: null,
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("admissions api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists applications with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listAdmissionApplications } = await import("./api");
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
    const result = await listAdmissionApplications({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/admissions/applications?");
    expect(url).toContain(`institute_id=${INST}`);
  });

  it("lists programs with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listAdmissionPrograms } = await import("./api");
    const payload = [
      {
        id: "pp111111-1111-4111-8111-111111111111",
        instituteId: INST,
        name: "Grade 10",
        slug: "grade-10",
        description: null,
        duration: null,
        eligibility: null,
        ageCriteria: null,
        seatsAvailable: 40,
        grades: null,
        academicYearLabel: "2026–27",
        applicationDeadline: null,
        status: "published" as const,
        createdByUserId: "uu111111-1111-4111-8111-111111111111",
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
    const result = await listAdmissionPrograms({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/admissions/programs?");
    expect(url).toContain(`institute_id=${INST}`);
  });

  it("lists openings with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listAdmissionOpenings } = await import("./api");
    const payload = [
      {
        id: "oo111111-1111-4111-8111-111111111111",
        instituteId: INST,
        programId: "pp111111-1111-4111-8111-111111111111",
        name: "Grade 10 · 2026",
        slug: "grade-10-2026",
        description: null,
        seatsAvailable: 20,
        academicYearLabel: "2026–27",
        applicationDeadline: null,
        status: "open" as const,
        createdByUserId: "uu111111-1111-4111-8111-111111111111",
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
    const result = await listAdmissionOpenings({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/admissions/openings?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
