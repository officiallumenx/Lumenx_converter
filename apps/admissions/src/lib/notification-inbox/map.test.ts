import { describe, it, expect } from "vitest";
import { inboxItemDtoToCareersNotification } from "./map";
import type { InboxItemDto } from "./types";

const dto: InboxItemDto = {
  id: "rec-1",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  notificationId: "notif-1",
  userProfileId: "user-1",
  readAt: null,
  starredAt: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  notification: {
    id: "notif-1",
    category: "careers",
    priority: "success",
    title: "Application submitted",
    body: "Your application ABCD1234 for Math Teacher has been submitted.",
    payload: { applicationId: "app-1" },
    deepLink: "/applications",
    templateId: null,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
};

describe("careers notification inbox map", () => {
  it("maps inbox dto to careers notification", () => {
    const row = inboxItemDtoToCareersNotification(dto, "user-1");
    expect(row.id).toBe("rec-1");
    expect(row.candidateId).toBe("user-1");
    expect(row.applicationId).toBe("app-1");
    expect(row.type).toBe("application");
    expect(row.read).toBe(false);
    expect(row.title).toBe("Application submitted");
  });
});
