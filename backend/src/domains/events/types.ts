/** Events / calendar foundation types aligned to event + calendar_event view. */

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

export type EventRow = {
  id: string;
  institute_id: string;
  title: string;
  kind: EventKind;
  custom_kind_label: string | null;
  source: EventSource;
  starts_on: string;
  ends_on: string | null;
  start_time: string | null;
  end_time: string | null;
  audience_scope: EventAudienceScope;
  audience_label: string | null;
  class_id: string | null;
  section_id: string | null;
  location: string | null;
  description: string | null;
  reminder: EventReminder;
  banner_asset_path: string | null;
  registration_required: boolean;
  recurrence: string | null;
  rsvp_count: number;
  published: boolean;
  published_at: string | null;
  cancelled: boolean;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type ListEventsFilter = {
  instituteId: string;
  source?: EventSource;
  kind?: EventKind;
  published?: boolean;
  from?: string;
  to?: string;
  includeCancelled?: boolean;
};

export type CreateEventInput = {
  instituteId: string;
  title: string;
  kind: EventKind;
  customKindLabel?: string | null;
  source: EventSource;
  startsOn: string;
  endsOn?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  audienceScope?: EventAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  location?: string | null;
  description?: string | null;
  reminder?: EventReminder;
  bannerAssetPath?: string | null;
  registrationRequired?: boolean;
  recurrence?: string | null;
  published?: boolean;
};

export type UpdateEventInput = {
  title?: string;
  kind?: EventKind;
  customKindLabel?: string | null;
  source?: EventSource;
  startsOn?: string;
  endsOn?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  audienceScope?: EventAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  location?: string | null;
  description?: string | null;
  reminder?: EventReminder;
  bannerAssetPath?: string | null;
  registrationRequired?: boolean;
  recurrence?: string | null;
};

export type CancelEventInput = {
  cancellationReason?: string | null;
};
