/** Mirrors backend EventDto — keep in sync with domains/events/types.ts. */

export type EventKind = "holiday" | "exam" | "meeting" | "function" | "custom";
export type EventSource = "calendar" | "events";

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
  location: string | null;
  description: string | null;
  registrationRequired: boolean;
  rsvpCount: number;
  published: boolean;
  cancelled: boolean;
};

export type SchoolCalendarItem = {
  id: string;
  title: string;
  kind: EventKind;
  kindLabel: string;
  date: string;
  endDate?: string;
  time?: string;
  venue?: string;
  description?: string;
  registrationRequired: boolean;
  rsvpCount: number;
};
