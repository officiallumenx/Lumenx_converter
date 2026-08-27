import { describe, expect, it } from "vitest";
import { announcementDtoToListItem, announcementDtosToListItems } from "./map";
import type { AnnouncementDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AnnouncementDto> = {}): AnnouncementDto {
  return {
    id: "ann-1",
    instituteId: INST,
    title: "Exam guidelines",
    body: "Please read carefully",
    audienceScope: "students",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    status: "published",
    scheduledAt: null,
    publishedAt: "2026-08-01T10:00:00Z",
    archivedAt: null,
    pinned: true,
    pinUntil: null,
    views: 42,
    createdByUserId: "user-1",
    createdAt: "2026-08-01T09:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("announcement DTO mapping", () => {
  it("maps published DTO to list item", () => {
    const item = announcementDtoToListItem(dto());
    expect(item).toMatchObject({
      id: "ann-1",
      title: "Exam guidelines",
      body: "Please read carefully",
      audience: "Students",
      views: 42,
      pinned: true,
      status: "published",
    });
    expect(item?.when).toBeTruthy();
  });

  it("prefers audienceLabel over scope", () => {
    const item = announcementDtoToListItem(
      dto({ audienceLabel: "Grade 10 · A" }),
    );
    expect(item?.audience).toBe("Grade 10 · A");
  });

  it("skips archived announcements", () => {
    expect(announcementDtoToListItem(dto({ status: "archived" }))).toBeNull();
  });

  it("filters archived from list mapping", () => {
    const items = announcementDtosToListItems([
      dto({ id: "1", status: "published" }),
      dto({ id: "2", status: "archived" }),
      dto({ id: "3", status: "draft" }),
    ]);
    expect(items.map((i) => i.id)).toEqual(["1", "3"]);
    expect(items[1]?.status).toBe("draft");
  });
});
