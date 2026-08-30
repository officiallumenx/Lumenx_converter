import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { HomeworkDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HW = "ffffffff-ffff-4fff-8fff-ffffffffffff";

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

  it("gets homework by id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getHomework } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: HW } }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await getHomework(HW, client);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/homework/${HW}`),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not call network for invalid get UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getHomework } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(getHomework("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
