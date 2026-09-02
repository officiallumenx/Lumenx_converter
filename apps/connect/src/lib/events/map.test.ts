import { describe, expect, it } from "vitest";
import {
  eventDtoToConnectItem,
  holidaysFromEventDtos,
  mapBackendKindToConnectKind,
} from "./map";
import type { EventDto } from "./types";

const baseDto = (patch: Partial<EventDto> = {}): EventDto => ({
  id: "ae111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "Science Fair",
  kind: "function",
  customKindLabel: null,
  source: "events",
  startsOn: "2026-09-20",
  endsOn: null,
  startTime: "09:00:00",
  endTime: null,
  audienceScope: "all",
  audienceLabel: null,
  classId: null,
  sectionId: null,
  location: "Auditorium",
  description: "Annual fair",
  reminder: "none",
  bannerAssetPath: null,
  registrationRequired: true,
  recurrence: null,
  rsvpCount: 12,
  published: true,
  publishedAt: "2026-08-01T10:00:00Z",
  cancelled: false,
  cancellationReason: null,
  cancelledAt: null,
  createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-01T10:00:00Z",
  ...patch,
});

describe("connect events map", () => {
  it("maps backend kinds to connect UI kinds", () => {
    expect(mapBackendKindToConnectKind({ kind: "holiday", customKindLabel: null })).toBe(
      "holiday",
    );
    expect(mapBackendKindToConnectKind({ kind: "exam", customKindLabel: null })).toBe(
      "exam-holiday",
    );
    expect(
      mapBackendKindToConnectKind({ kind: "custom", customKindLabel: "Sports day" }),
    ).toBe("sports");
  });

  it("maps dto to connect item with registration badge data", () => {
    const item = eventDtoToConnectItem(baseDto());
    expect(item.registrationRequired).toBe(true);
    expect(item.rsvpCount).toBe(12);
    expect(item.venue).toBe("Auditorium");
  });

  it("expands multi-day holidays", () => {
    const holidays = holidaysFromEventDtos([
      baseDto({
        kind: "holiday",
        startsOn: "2026-10-01",
        endsOn: "2026-10-03",
        title: "Break",
      }),
    ]);
    expect(holidays.map((h) => h.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });
});
