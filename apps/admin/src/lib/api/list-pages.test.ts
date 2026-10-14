import { describe, expect, it, vi } from "vitest";
import { fetchAllListPages, fetchListPage } from "./list-pages";

describe("fetchListPage", () => {
  it("returns items and cursor metadata from an envelope", async () => {
    const client = {
      request: async () => ({
        data: [{ id: "1" }],
        next_cursor: "c1",
        has_more: true,
      }),
    };
    const page = await fetchListPage<{ id: string }>(
      client as never,
      "/api/v1/students?limit=100",
    );
    expect(page).toEqual({
      items: [{ id: "1" }],
      nextCursor: "c1",
      hasMore: true,
    });
  });
});

describe("fetchAllListPages", () => {
  it("walks cursors until has_more is false", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "1" }, { id: "2" }],
        next_cursor: "c1",
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [{ id: "3" }],
        next_cursor: null,
        has_more: false,
      });

    const items = await fetchAllListPages<{ id: string }>(
      { request } as never,
      (cursor) => `/api/v1/students?cursor=${cursor ?? ""}`,
    );

    expect(items.map((x) => x.id)).toEqual(["1", "2", "3"]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][1]).toMatchObject({ envelope: true });
  });

  it("stops when next_cursor is missing even if has_more is true", async () => {
    const request = vi.fn().mockResolvedValue({
      data: [{ id: "a" }],
      next_cursor: null,
      has_more: true,
    });
    const items = await fetchAllListPages(
      { request } as never,
      () => "/api/v1/students",
    );
    expect(items).toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
