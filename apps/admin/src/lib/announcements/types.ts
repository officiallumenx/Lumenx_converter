/** Mirrors backend AnnouncementDto — keep in sync with domains/announcements/types.ts. */

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
  | "classes";

export type AnnouncementDto = {
  id: string;
  instituteId: string;
  title: string;
  body: string | null;
  audienceScope: AnnouncementAudienceScope;
  audienceLabel: string | null;
  classId: string | null;
  sectionId: string | null;
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

/** Existing Announcements page list model. */
export type AnnouncementListItem = {
  id: string;
  title: string;
  body?: string;
  audience: string;
  author: string;
  views: number;
  when: string;
  pinned: boolean;
  status: "published" | "draft" | "scheduled";
};
