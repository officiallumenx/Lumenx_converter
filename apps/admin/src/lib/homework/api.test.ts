import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { HomeworkDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("homework api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists homework with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listHomework } = await import("./api");
    const payload: HomeworkDto[] = [];
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
    await listHomework({ instituteId: INST }, client);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/homework?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
