import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { CareerApplicationDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<CareerApplicationDto> = {}): CareerApplicationDto {
  return {
    id: "ca111111-1111-4111-8111-111111111111",
    instituteId: INST,
    jobId: "jj111111-1111-4111-8111-111111111111",
    candidateProfileId: null,
    applicantUserId: "uu111111-1111-4111-8111-111111111111",
    status: "under_review",
    coverLetter: null,
    payload: { name: "Priya Nair", jobTitle: "Math Teacher" },
    decisionNote: null,
    convertedTeacherId: null,
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("careers api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists applications with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listCareerApplications } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto()] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listCareerApplications({ instituteId: INST }, client);
    expect(result).toEqual([dto()]);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/careers/applications?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
