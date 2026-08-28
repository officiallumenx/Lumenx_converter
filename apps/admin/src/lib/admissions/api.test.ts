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
});
