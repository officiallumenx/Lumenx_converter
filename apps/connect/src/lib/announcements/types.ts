export type AnnouncementAudienceScope =
  | "all"
  | "students"
  | "parents"
  | "teachers"
  | "classes"
  | "activity_team";

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
  status: "draft" | "scheduled" | "published" | "archived";
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

export type ListAnnouncementsParams = {
  instituteId: string;
  pinned?: boolean;
  audienceScope?: AnnouncementAudienceScope;
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
  publishNow?: boolean;
  pinned?: boolean;
};
