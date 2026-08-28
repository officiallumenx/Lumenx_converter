import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { StaffAttendanceDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("staff-attendance api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists staff attendance with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listStaffAttendance } = await import("./api");
    const payload: StaffAttendanceDto[] = [];
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
    await listStaffAttendance({ instituteId: INST, date: "2026-06-01" }, client);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/staff-attendance?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
