import { describe, expect, it } from "vitest";
import { recycleDtoToListItem } from "./map";

describe("nexus recycle map", () => {
  it("maps dto to list item with instituteId", () => {
    const item = recycleDtoToListItem({
      id: "a0111111-1111-4111-8111-111111111111",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      entityKind: "student",
      entityId: "s0111111-1111-4111-8111-111111111111",
      module: "Students",
      title: "Ada",
      subtitle: "A-1",
      status: "in_bin",
      deletedByUserId: "11111111-1111-4111-8111-111111111111",
      deletedAt: "2026-08-20T00:00:00.000Z",
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });
    expect(item.instituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(item.subtitle).toBe("A-1");
  });
});
