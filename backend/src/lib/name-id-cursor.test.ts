import { describe, expect, it } from "vitest";
import {
  clampListLimit,
  decodeNameIdCursor,
  encodeNameIdCursor,
  nameIdCursorOrFilter,
  nextNameIdCursorFromRows,
} from "./name-id-cursor.js";

describe("name-id cursor", () => {
  it("round-trips and clamps limits", () => {
    const encoded = encodeNameIdCursor({ name: "Ada", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    expect(decodeNameIdCursor(encoded)).toEqual({
      name: "Ada",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(decodeNameIdCursor("not-valid")).toBeNull();
    expect(clampListLimit(undefined)).toBe(100);
    expect(clampListLimit(9999)).toBe(200);
  });

  it("builds a stable compound filter and page boundary", () => {
    const filter = nameIdCursorOrFilter(
      { name: 'O"Brien', id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      "display_name",
    );
    expect(filter).toContain('display_name.gt."OBrien"');
    expect(filter).toContain("id.gt.bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    const page = nextNameIdCursorFromRows(
      [
        { id: "1", display_name: "A" },
        { id: "2", display_name: "B" },
        { id: "3", display_name: "C" },
      ],
      2,
      (r) => r.display_name,
    );
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(decodeNameIdCursor(page.nextCursor)?.id).toBe("2");
  });

  it("does not emit a cursor when the page is exact", () => {
    const page = nextNameIdCursorFromRows(
      [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ],
      2,
      (r) => r.name,
    );
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});
