/** Announcements foundation types aligned to announcement table. */

export type AnnouncementStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";

export type AnnouncementAudienceScope =
  | "all"
  | "students"
  | "parents"
  | "teachers"
  | "classes"
  | "activity_team";

export type AnnouncementRow = {
  id: string;
  institute_id: string;
  title: string;
  body: string | null;
  audience_scope: AnnouncementAudienceScope;
  audience_label: string | null;
  class_id: string | null;
  section_id: string | null;
  activity_team_id: string | null;
  status: AnnouncementStatus;
  scheduled_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  pinned: boolean;
  pin_until: string | null;
  views: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AnnouncementDto = {
  id: string;
  instituteId: string;
  title: string;
  body: string | null;
  audienceScope: AnnouncementAudienceScope;
  audienceLabel: string | null;
  classId: string | null;
  sectionId: string | null;
  activityTeamId: string | null;
  status: AnnouncementStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  pinned: boolean;
  pinUntil: string | null;
  views: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ListAnnouncementsFilter = {
  instituteId: string;
  status?: AnnouncementStatus;
  audienceScope?: AnnouncementAudienceScope;
  pinned?: boolean;
};

export type CreateAnnouncementInput = {
  instituteId: string;
  title: string;
  body?: string | null;
  audienceScope?: AnnouncementAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  activityTeamId?: string | null;
  /** When set, creates as scheduled; otherwise draft unless publishNow. */
  scheduledAt?: string | null;
  publishNow?: boolean;
  pinned?: boolean;
  pinUntil?: string | null;
};

export type UpdateAnnouncementInput = {
  title?: string;
  body?: string | null;
  audienceScope?: AnnouncementAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  activityTeamId?: string | null;
  scheduledAt?: string | null;
  pinned?: boolean;
  pinUntil?: string | null;
};
