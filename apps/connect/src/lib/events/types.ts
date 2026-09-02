/** Mirrors backend EventDto — keep in sync with domains/events/types.ts. */

export type EventKind = "holiday" | "exam" | "meeting" | "function" | "custom";
export type EventSource = "calendar" | "events";
export type EventAudienceScope =
  | "all"
  | "students"
  | "parents"
  | "teachers"
  | "classes";

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
  reminder: string;
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

export type ListEventsParams = {
  instituteId: string;
  source?: EventSource;
  kind?: EventKind;
  from?: string;
  to?: string;
};

export type ListCalendarParams = {
  instituteId: string;
  from?: string;
  to?: string;
};

/** Connect UI event row (maps to SchoolEvent shape). */
export type ConnectEventItem = {
  id: string;
  title: string;
  kind:
    | "event"
    | "holiday"
    | "workshop"
    | "seminar"
    | "sports"
    | "celebration"
    | "exam-holiday"
    | "announcement";
  backendKind: EventKind;
  date: string;
  endDate?: string;
  time?: string;
  venue?: string;
  description?: string;
  registrationRequired: boolean;
  rsvpCount: number;
  cancelled: boolean;
  source: EventSource;
};

export type InstituteHolidayItem = {
  id: string;
  date: string;
  title: string;
  purpose: string;
};
