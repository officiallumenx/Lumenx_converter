import { describe, expect, it } from "vitest";
import {
  auditEventDtoToListItem,
  labelPlatformAuditAction,
} from "./map";
import type { PlatformAuditEventDto } from "./types";

describe("nexus audit map", () => {
  it("maps platform audit dto to list item with operator and labels", () => {
    const dto: PlatformAuditEventDto = {
      id: "11111111-1111-4111-8111-111111111111",
      scope: "platform",
      instituteId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      action: "registration_approved",
      entityType: "institute",
      entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      metadata: {
        operator: "nexus_root",
        targetLabel: "Alpha International School",
        before: "Pending",
        after: "Approved",
        summary: "Registration approved",
      },
      createdAt: "2026-01-05T10:00:00.000Z",
    };

    const item = auditEventDtoToListItem(dto);
    expect(item.operator).toBe("nexus_root");
    expect(item.targetLabel).toBe("Alpha International School");
    expect(item.instituteRouteId).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(labelPlatformAuditAction(item.action)).toBe("Registration approved");
  });

  it("humanizes unknown actions", () => {
    expect(labelPlatformAuditAction("custom_action")).toBe("Custom Action");
  });
});
