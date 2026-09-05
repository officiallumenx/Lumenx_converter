import { listPhase7Inbox } from "@lumenx/module-notifications";
import type { AnnouncementDto } from "./types";
import { subscribeAnnouncementInboxSync } from "./inbox-sync";

export type ConnectAnnouncementPortalRole = "parent" | "student" | "teacher";
type Phase7Audience = ConnectAnnouncementPortalRole | "admin";

function mapPortalRole(role: ConnectAnnouncementPortalRole): Phase7Audience {
  return role;
}

function phase7RowToDto(row: {
  id: string;
  title: string;
  desc?: string;
  detail?: string;
  time?: string;
  href?: string;
  priority?: string;
  createdAt?: string;
}): AnnouncementDto {
  const rawId = row.id.replace(/^ann-/, "");
  const createdAt = row.createdAt ?? new Date().toISOString();

  return {
    id: rawId,
    instituteId: "ins-test1school",
    title: row.title,
    body: (row.detail ?? row.desc ?? row.title).trim(),
    audienceScope: "all",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    activityTeamId: null,
    status: "published",
    scheduledAt: null,
    publishedAt: createdAt,
    archivedAt: null,
    pinned: row.priority === "high" || row.priority === "critical",
    pinUntil: null,
    views: 0,
    createdByUserId: "demo",
    createdAt,
    updatedAt: createdAt,
  };
}

export function listDemoAnnouncements(role: ConnectAnnouncementPortalRole): AnnouncementDto[] {
  return listPhase7Inbox(mapPortalRole(role))
    .filter((row) => row.module === "announcements")
    .map(phase7RowToDto)
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt),
    );
}

export function findDemoAnnouncement(
  role: ConnectAnnouncementPortalRole,
  id: string,
): AnnouncementDto | null {
  const normalized = id.replace(/^ann-/, "");
  return listDemoAnnouncements(role).find((row) => row.id === normalized) ?? null;
}

export function subscribeDemoAnnouncements(onChange: () => void): () => void {
  return subscribeAnnouncementInboxSync(onChange);
}
