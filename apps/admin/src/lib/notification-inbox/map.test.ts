import { describe, expect, it } from "vitest";
import {
  inboxItemDtoToListItem,
  inboxItemDtosToListItems,
  relativeInboxTimeLabel,
} from "./map";
import type { InboxItemDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<InboxItemDto> = {}): InboxItemDto {
  return {
    id: "inbox-1",
    instituteId: INST,
    notificationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    userProfileId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    readAt: null,
    starredAt: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    notification: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      category: "fees",
      priority: "normal",
      title: "Fee reminder",
      body: "Term 2 balance pending",
      payload: {},
      deepLink: "/fees",
      templateId: "fees.reminder",
      createdAt: "2026-06-01T09:00:00Z",
    },
    ...overrides,
  };
}

describe("notification inbox DTO mapping", () => {
  it("maps unread from readAt", () => {
    expect(inboxItemDtoToListItem(dto({ readAt: null })).unread).toBe(true);
    expect(
      inboxItemDtoToListItem(dto({ readAt: "2026-06-01T11:00:00Z" })).unread,
    ).toBe(false);
  });

  it("maps priority to presentation type", () => {
    expect(
      inboxItemDtoToListItem(
        dto({ notification: { ...dto().notification, priority: "critical" } }),
      ).type,
    ).toBe("warning");
    expect(
      inboxItemDtoToListItem(
        dto({ notification: { ...dto().notification, priority: "success" } }),
      ).type,
    ).toBe("positive");
    expect(
      inboxItemDtoToListItem(
        dto({ notification: { ...dto().notification, priority: "normal" } }),
      ).type,
    ).toBe("info");
  });

  it("maps backend category to UI category", () => {
    expect(
      inboxItemDtoToListItem(
        dto({ notification: { ...dto().notification, category: "homework" } }),
      ).category,
    ).toBe("assignments");
    expect(
      inboxItemDtoToListItem(
        dto({ notification: { ...dto().notification, category: "system" } }),
      ).category,
    ).toBe("emergency");
  });

  it("maps deepLink to href", () => {
    expect(inboxItemDtoToListItem(dto()).href).toBe("/fees");
    expect(
      inboxItemDtoToListItem(
        dto({ notification: { ...dto().notification, deepLink: null } }),
      ).href,
    ).toBeUndefined();
  });

  it("falls back title and body when blank", () => {
    const item = inboxItemDtoToListItem(
      dto({
        notification: {
          ...dto().notification,
          title: "   ",
          body: "",
        },
      }),
    );
    expect(item.title).toBe("Notification");
    expect(item.desc).toBe("");
    expect(item.detail).toBe("");
  });

  it("uses notification createdAt for relative time label", () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    const item = inboxItemDtoToListItem(
      dto({
        notification: { ...dto().notification, createdAt: recent },
      }),
    );
    expect(item.time).toMatch(/m ago|Just now/);
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = inboxItemDtosToListItems([dto(), dto({ id: "inbox-2" })]);
    expect(items).toHaveLength(2);
    expect(() => inboxItemDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });

  it("relativeInboxTimeLabel handles invalid dates", () => {
    expect(relativeInboxTimeLabel("not-a-date")).toBe("not-a-date");
  });
});
