import { describe, expect, it } from "vitest";
import { recycleDtoToListItem, recycleDtosToListItems } from "./map";
import type { RecycleItemDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<RecycleItemDto> = {}): RecycleItemDto {
  return {
    id: "recycle-1",
    instituteId: INST,
    entityKind: "event",
    entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    module: "Events",
    title: "Annual Day",
    subtitle: "Function",
    snapshot: { foo: "bar" },
    status: "in_bin",
    deletedByUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    deletedAt: "2026-06-01T10:00:00Z",
    restoredByUserId: null,
    restoredAt: null,
    purgedByUserId: null,
    purgedAt: null,
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("recycle DTO mapping", () => {
  it("maps core list fields", () => {
    const item = recycleDtoToListItem(dto());
    expect(item).toMatchObject({
      id: "recycle-1",
      module: "Events",
      title: "Annual Day",
      subtitle: "Function",
      deletedAt: "2026-06-01T10:00:00Z",
    });
  });

  it("maps deletedByUserId to presentation label", () => {
    expect(recycleDtoToListItem(dto()).deletedBy).toBe("User dddddddd");
  });

  it("falls back when deletedByUserId is absent", () => {
    expect(
      recycleDtoToListItem(dto({ deletedByUserId: "" })).deletedBy,
    ).toBe("User");
  });

  it("falls back title when missing", () => {
    expect(recycleDtoToListItem(dto({ title: "  " })).title).toBe(
      "Untitled item",
    );
  });

  it("omits empty subtitle", () => {
    expect(recycleDtoToListItem(dto({ subtitle: null })).subtitle).toBeUndefined();
    expect(recycleDtoToListItem(dto({ subtitle: "  " })).subtitle).toBeUndefined();
  });

  it("does not expose snapshot in list item", () => {
    expect(recycleDtoToListItem(dto())).not.toHaveProperty("snapshot");
  });

  it("maps multiple DTOs", () => {
    const items = recycleDtosToListItems([dto(), dto({ id: "recycle-2" })]);
    expect(items).toHaveLength(2);
  });
});
