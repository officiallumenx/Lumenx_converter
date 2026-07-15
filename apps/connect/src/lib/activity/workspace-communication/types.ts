/**
 * Shared Activity Workspace communication — single source for Messages,
 * Notifications, and Announcements (not duplicated per module).
 */
export type WorkspaceCommunicationKind = "message" | "notification" | "announcement";

export type WorkspaceCommunicationAudience =
  | "institute"
  | "teams"
  | "clubs"
  | "groups"
  | "students"
  | "parents"
  | "teachers";

export type WorkspaceCommunicationItem = {
  id: string;
  kind: WorkspaceCommunicationKind;
  title: string;
  body: string;
  sentAt: string;
  audienceLabel: string;
  audiences: WorkspaceCommunicationAudience[];
  unread?: boolean;
  pinned?: boolean;
};

export type WorkspaceCommunicationFilters = {
  kind?: WorkspaceCommunicationKind | "all";
  query?: string;
};
