/** Mirrors backend EventDto — keep in sync with domains/events/types.ts. */

export type EventKind = "holiday" | "exam" | "meeting" | "function" | "custom";
export type EventSource = "calendar" | "events";
export type EventAudienceScope =
  | "all"
  | "students"
  | "parents"
  | "teachers"
  | "classes";
export type EventReminder =
  | "none"
  | "one_day"
  | "one_hour"
  | "one_week_one_day";

export type EventDto = {
  id: string;
  instituteId: string;
  title: string;
  kind: EventKind;
  customKindLabel: string | null;
  source: EventSource;
  startsOn: string;
  endsOn: string | null;
  startTime: string | null;
  endTime: string | null;
  audienceScope: EventAudienceScope;
  audienceLabel: string | null;
  classId: string | null;
  sectionId: string | null;
  location: string | null;
  description: string | null;
  reminder: EventReminder;
  bannerAssetPath: string | null;
  registrationRequired: boolean;
  recurrence: string | null;
  rsvpCount: number;
  published: boolean;
  publishedAt: string | null;
  cancelled: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Presentation-only row consumed by the Events admin route.
 * Never used as tenant/auth authority.
 */
export type EventsListItem = {
  id: string;
  title: string;
  date: string;
  /** Preset or custom label */
  type: string;
  audience: string;
  location: string;
  description?: string;
  reminder?: string;
  bannerDataUrl?: string;
  rsvp?: number;
  published: boolean;
};

export type ListEventsParams = {
  instituteId: string;
  source?: EventSource;
  kind?: EventKind;
  published?: boolean;
  from?: string;
  to?: string;
  includeCancelled?: boolean;
};
