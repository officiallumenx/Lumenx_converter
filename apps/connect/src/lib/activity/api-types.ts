/** Mirrors backend activity DTOs (Connect API mode). */

export type ActivityDomain = "sports" | "eca";
export type SportsCategory = "indoor" | "outdoor";
export type ActivityTeamKind = "team" | "group";
export type ActivityMembershipStatus = "active" | "left";
export type AchievementKind = "award" | "certificate" | "participation" | "other";
export type PracticeSessionStatus = "scheduled" | "completed" | "cancelled";

export type ActivitySectionDto = {
  id: string;
  instituteId: string;
  domain: ActivityDomain;
  sportsCategory: SportsCategory | null;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTeamDto = {
  id: string;
  instituteId: string;
  sectionId: string;
  kind: ActivityTeamKind;
  name: string;
  status: "active" | "archived";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityMembershipDto = {
  id: string;
  instituteId: string;
  teamId: string;
  studentId: string;
  role: "member" | "captain" | "coach_assist";
  status: ActivityMembershipStatus;
  joinedAt: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AchievementDto = {
  id: string;
  instituteId: string;
  studentId: string;
  sectionId: string | null;
  teamId: string | null;
  title: string;
  kind: AchievementKind;
  awardedOn: string;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeSessionDto = {
  id: string;
  instituteId: string;
  teamId: string;
  title: string;
  scheduledOn: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  status: PracticeSessionStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTeamRecipientsDto = {
  teamId: string;
  recipientUserIds: string[];
};
