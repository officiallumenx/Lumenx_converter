import { describe, expect, it, vi } from "vitest";
import { fillAuthorizedPage } from "./fill-authorized-page.js";

describe("fillAuthorizedPage", () => {
  it("fills a full page by walking empty filtered repo pages", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: "a" }, { id: "b" }],
        nextCursor: "c1",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        rows: [{ id: "c" }, { id: "d" }],
        nextCursor: "c2",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        rows: [{ id: "e" }],
        nextCursor: null,
        hasMore: false,
      });

    const allowed = new Set(["d", "e"]);
    const page = await fillAuthorizedPage({
      limit: 2,
      cursor: null,
      fetchPage,
      mapAuthorized: (rows) => rows.filter((r) => allowed.has(r.id)),
    });

    expect(page.items.map((r) => r.id)).toEqual(["d", "e"]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("keeps hasMore when authorized items fill the limit and repo has more", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      rows: [{ id: "1" }, { id: "2" }, { id: "3" }],
      nextCursor: "next",
      hasMore: true,
    });

    const page = await fillAuthorizedPage({
      limit: 2,
      cursor: null,
      fetchPage,
      mapAuthorized: (rows) => rows,
    });

    // May slightly exceed limit so mid-page authorized rows are not skipped.
    expect(page.items.length).toBeGreaterThanOrEqual(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("next");
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("never returns unauthorized rows", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      rows: [{ id: "secret" }, { id: "ok" }],
      nextCursor: null,
      hasMore: false,
    });

    const page = await fillAuthorizedPage({
      limit: 10,
      cursor: null,
      fetchPage,
      mapAuthorized: (rows) => rows.filter((r) => r.id === "ok"),
    });

    expect(page.items).toEqual([{ id: "ok" }]);
  });

  it("returns empty page with hasMore when later pages may contain rows", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: "x" }],
        nextCursor: "c1",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        rows: [{ id: "y" }],
        nextCursor: "c2",
        hasMore: true,
      });

    // Max one fetch → empty authorized but cursor advanced for client continue.
    const page = await fillAuthorizedPage({
      limit: 5,
      cursor: null,
      fetchPage,
      mapAuthorized: () => [],
      maxFetches: 1,
    });

    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("c1");
  });
});
