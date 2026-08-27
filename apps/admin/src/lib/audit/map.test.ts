import { describe, expect, it } from "vitest";
import { auditEventDtoToListItem, auditEventDtosToListItems } from "./map";
import type { AuditEventDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AuditEventDto> = {}): AuditEventDto {
  return {
    id: "aud-1",
    scope: "institute",
    instituteId: INST,
    actorUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    action: "Published marks",
    entityType: "marks_entry",
    entityId: "entry-1",
    metadata: {
      actorName: "Admin R. Chen",
      actorRole: "Admin",
      status: "success",
      target: "MTH-101 · Mid-term",
    },
    createdAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("audit DTO mapping", () => {
  it("maps DTO metadata into AuditEntry presentation fields", () => {
    const item = auditEventDtoToListItem(dto());
    expect(item).toMatchObject({
      id: "aud-1",
      user: "Admin R. Chen",
      role: "Admin",
      action: "Published marks",
      target: "MTH-101 · Mid-term",
      module: "Marks",
      status: "success",
      actorScope: "admin",
    });
    expect(item.atSort).toBe("2026-08-01T10:00:00Z");
  });

  it("falls back when metadata is sparse", () => {
    const item = auditEventDtoToListItem(
      dto({
        metadata: {},
        actorUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        entityType: "student",
        entityId: "stu-9",
      }),
    );
    expect(item.user).toMatch(/^User cccccccc/);
    expect(item.role).toBe("Admin");
    expect(item.target).toBe("student · stu-9");
    expect(item.module).toBe("Students");
    expect(item.status).toBe("info");
  });

  it("maps a list of DTOs", () => {
    const items = auditEventDtosToListItems([dto({ id: "1" }), dto({ id: "2" })]);
    expect(items.map((i) => i.id)).toEqual(["1", "2"]);
  });
});
