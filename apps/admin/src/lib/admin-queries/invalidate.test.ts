import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminQueryKeys } from "./keys";
import { invalidateAdminSoftRefresh } from "./invalidate";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("invalidateAdminSoftRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips signed-url and infinite directory keys", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateAdminSoftRefresh(queryClient, INST);

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    const opts = invalidateSpy.mock.calls[0]?.[0] as {
      predicate: (query: { queryKey: readonly unknown[] }) => boolean;
    };
    expect(opts.predicate).toBeTypeOf("function");

    expect(
      opts.predicate({
        queryKey: adminQueryKeys.photosSignedUrl("student", "s1"),
      }),
    ).toBe(false);
    expect(
      opts.predicate({
        queryKey: [...adminQueryKeys.marks(INST), "infinite"],
      }),
    ).toBe(false);
    expect(
      opts.predicate({
        queryKey: adminQueryKeys.notifications(INST),
      }),
    ).toBe(true);
  });
});
