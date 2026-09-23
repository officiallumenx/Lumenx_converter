import { describe, expect, it } from "vitest";
import { inboxItemDtoToAppNotification } from "./map";
import type { InboxItemDto } from "./types";

const dto: InboxItemDto = {
  id: "11111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  notificationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  userProfileId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  readAt: null,
  starredAt: null,
  createdAt: "2026-09-21T10:00:00.000Z",
  updatedAt: "2026-09-21T10:00:00.000Z",
  notification: {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    category: "homework",
    priority: "normal",
    title: "Homework published",
    body: "Algebra worksheet due Friday",
    payload: { entityType: "homework", entityId: "hw-1" },
    deepLink: "/assignments",
    templateId: null,
    createdAt: "2026-09-21T10:00:00.000Z",
    dueAt: null,
  },
};

describe("connect inbox map", () => {
  it("maps normal homework as info not high/emergency", () => {
    const row = inboxItemDtoToAppNotification(dto);
    expect(row.type).toBe("info");
    expect(row.priority).toBe("normal");
    expect(row.category).toBe("assignments");
    expect(row.payload?.entityType).toBe("homework");
  });

  it("does not treat system category as emergency", () => {
    const row = inboxItemDtoToAppNotification({
      ...dto,
      notification: { ...dto.notification, category: "system", priority: "normal" },
    });
    expect(row.category).toBe("circulars");
    expect(row.priority).toBe("normal");
  });

  it("maps critical to high warning", () => {
    const row = inboxItemDtoToAppNotification({
      ...dto,
      notification: { ...dto.notification, priority: "critical" },
    });
    expect(row.type).toBe("warning");
    expect(row.priority).toBe("high");
  });
});
