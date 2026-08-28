import { describe, expect, it } from "vitest";
import {
  eventDtoToListItem,
  eventDtosToListItems,
  formatEventWhenFromDto,
} from "./map";
import type { EventDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<EventDto> = {}): EventDto {
  return {
    id: "evt-1",
    instituteId: INST,
    title: "Founders Day",
    kind: "function",
    customKindLabel: null,
    source: "events",
    startsOn: "2026-06-01",
    endsOn: null,
    startTime: "09:00:00",
    endTime: "17:00:00",
    audienceScope: "all",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    location: "Auditorium",
    description: "Annual celebration",
    reminder: "one_day",
    bannerAssetPath: null,
    registrationRequired: false,
    recurrence: null,
    rsvpCount: 42,
    published: false,
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

describe("events DTO mapping", () => {
  it("maps standard kind to display type", () => {
    expect(eventDtoToListItem(dto({ kind: "meeting" })).type).toBe("meeting");
  });

  it("uses customKindLabel for custom kind", () => {
    const item = eventDtoToListItem(
      dto({ kind: "custom", customKindLabel: "Workshop" }),
    );
    expect(item.type).toBe("Workshop");
  });

  it("falls back when custom kind has no label", () => {
    expect(
      eventDtoToListItem(dto({ kind: "custom", customKindLabel: null })).type,
    ).toBe("custom");
  });

  it("formats date and time for display", () => {
    const when = formatEventWhenFromDto({
      startsOn: "2026-06-01",
      endsOn: null,
      startTime: "09:00:00",
      endTime: null,
    });
    expect(when).toContain("Jun");
    expect(when).toContain("1");
    expect(when).not.toContain("All day");
  });

  it("formats all-day events without start time", () => {
    const when = formatEventWhenFromDto({
      startsOn: "2026-06-01",
      endsOn: null,
      startTime: null,
      endTime: null,
    });
    expect(when).toContain("All day");
  });

  it("uses audienceLabel when present", () => {
    expect(
      eventDtoToListItem(dto({ audienceLabel: "Classes · 10-A" })).audience,
    ).toBe("Classes · 10-A");
  });

  it("falls back from audienceScope when label absent", () => {
    expect(
      eventDtoToListItem(
        dto({ audienceScope: "students", audienceLabel: null }),
      ).audience,
    ).toBe("Students");
  });

  it("maps rsvpCount to RSVP display data", () => {
    expect(eventDtoToListItem(dto({ rsvpCount: 128 })).rsvp).toBe(128);
  });

  it("maps published flag for draft/published UI", () => {
    expect(eventDtoToListItem(dto({ published: false })).published).toBe(
      false,
    );
    expect(eventDtoToListItem(dto({ published: true })).published).toBe(true);
  });

  it("falls back location to TBD", () => {
    expect(eventDtoToListItem(dto({ location: null })).location).toBe("TBD");
    expect(eventDtoToListItem(dto({ location: "  " })).location).toBe("TBD");
  });

  it("maps multiple DTOs", () => {
    const items = eventDtosToListItems([dto(), dto({ id: "evt-2" })]);
    expect(items).toHaveLength(2);
  });
});
