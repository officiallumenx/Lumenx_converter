import { describe, expect, it } from "vitest";
import {
  eventDtoToCalendarListItem,
  eventDtosToCalendarListItems,
} from "./map";
import type { EventDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<EventDto> = {}): EventDto {
  return {
    id: "cal-1",
    instituteId: INST,
    title: "Mid-term exams",
    kind: "exam",
    customKindLabel: null,
    source: "calendar",
    startsOn: "2026-06-01",
    endsOn: null,
    startTime: "09:00:00",
    endTime: "17:00:00",
    audienceScope: "all",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    location: null,
    description: null,
    reminder: "none",
    bannerAssetPath: null,
    registrationRequired: false,
    recurrence: null,
    rsvpCount: 0,
    published: true,
    publishedAt: null,
    cancelled: false,
    cancellationReason: null,
    cancelledAt: null,
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    ...overrides,
  };
}

describe("calendar DTO mapping", () => {
  it("maps standard kinds predictably", () => {
    expect(eventDtoToCalendarListItem(dto({ kind: "holiday" })).kind).toBe(
      "holiday",
    );
    expect(eventDtoToCalendarListItem(dto({ kind: "exam" })).kind).toBe("exam");
    expect(eventDtoToCalendarListItem(dto({ kind: "meeting" })).kind).toBe(
      "meeting",
    );
  });

  it("uses customKindLabel for custom kind", () => {
    const item = eventDtoToCalendarListItem(
      dto({ kind: "custom", customKindLabel: "Staff retreat" }),
    );
    expect(item.kind).toBe("Staff retreat");
  });

  it("falls back when custom kind has no label", () => {
    expect(
      eventDtoToCalendarListItem(
        dto({ kind: "custom", customKindLabel: null }),
      ).kind,
    ).toBe("custom");
  });

  it("normalizes startTime to HH:MM", () => {
    const item = eventDtoToCalendarListItem(dto({ startTime: "09:30:00" }));
    expect(item.time).toBe("09:30");
  });

  it("omits time for all-day events", () => {
    expect(
      eventDtoToCalendarListItem(dto({ startTime: null })).time,
    ).toBeUndefined();
  });

  it("includes endDate only when endsOn differs from startsOn", () => {
    expect(
      eventDtoToCalendarListItem(
        dto({ startsOn: "2026-06-01", endsOn: "2026-06-05" }),
      ).endDate,
    ).toBe("2026-06-05");
    expect(
      eventDtoToCalendarListItem(
        dto({ startsOn: "2026-06-01", endsOn: "2026-06-01" }),
      ).endDate,
    ).toBeUndefined();
    expect(
      eventDtoToCalendarListItem(dto({ endsOn: null })).endDate,
    ).toBeUndefined();
  });

  it("uses startsOn as date", () => {
    expect(eventDtoToCalendarListItem(dto({ startsOn: "2026-07-15" })).date).toBe(
      "2026-07-15",
    );
  });

  it("falls back title when missing or blank", () => {
    expect(eventDtoToCalendarListItem(dto({ title: "" })).title).toBe(
      "Untitled",
    );
    expect(
      eventDtoToCalendarListItem(dto({ title: "   " })).title,
    ).toBe("Untitled");
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = eventDtosToCalendarListItems([dto(), dto({ id: "cal-2" })]);
    expect(items).toHaveLength(2);
    expect(() => eventDtosToCalendarListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
