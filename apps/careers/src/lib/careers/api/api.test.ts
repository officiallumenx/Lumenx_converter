import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { CareerJobDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("careers api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists jobs with institute_id in API mode", async () => {
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "api");
    const { listCareerJobs } = await import("./api");
    const payload: CareerJobDto[] = [
      {
        id: "jj111111-1111-4111-8111-111111111111",
        instituteId: INST,
        title: "Math Teacher",
        slug: "math-teacher",
        description: null,
        category: "Teaching",
        employmentType: "full_time",
        workMode: "onsite",
        locationLabel: "Campus A",
        openingsCount: 2,
        status: "open",
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
    const result = await listCareerJobs({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/careers/jobs?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
