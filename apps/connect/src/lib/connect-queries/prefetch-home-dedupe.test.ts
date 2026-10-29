import { afterEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { prefetchStudentModuleQueries } from "./prefetch-student";
import { prefetchTeacherModuleQueries } from "./prefetch-teacher";

function mockQueryClient() {
  return {
    prefetchQuery: vi.fn().mockResolvedValue(undefined),
  } as unknown as QueryClient;
}

describe("home prefetch dedupe", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not start critical student prefetches that overlap the portal snapshot", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const qc = mockQueryClient();

    prefetchStudentModuleQueries(
      qc,
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    );

    // critical: [] — nothing until idle deferred work
    expect(qc.prefetchQuery).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(qc.prefetchQuery).toHaveBeenCalled();
    const keys = (qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => JSON.stringify(c[0]?.queryKey ?? []),
    );
    // Enrich already loads marks/events — must not re-prefetch them on cold Home.
    expect(keys.some((k) => k.includes("marks"))).toBe(false);
    expect(keys.some((k) => k.includes('"events"'))).toBe(false);
  });

  it("does not start critical teacher prefetches that compete with Home bundle", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const qc = mockQueryClient();

    prefetchTeacherModuleQueries(
      qc,
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    );

    expect(qc.prefetchQuery).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(qc.prefetchQuery).toHaveBeenCalled();
  });
});
