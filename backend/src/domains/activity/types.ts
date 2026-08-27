/** Activity / Sports / ECA foundation types (step 6.3). */

export type ActivityDomain = "sports" | "eca";
export type SportsCategory = "indoor" | "outdoor";
export type ActivitySectionStatus = "draft" | "active" | "archived";

export type ActivityTeamKind = "team" | "group";
export type ActivityTeamStatus = "active" | "archived";

export type ActivityMembershipRole = "member" | "captain" | "coach_assist";
export type ActivityMembershipStatus = "active" | "left";

export type AchievementKind =
  | "award"
  | "certificate"
  | "participation"
  | "other";

export type PracticeSessionStatus = "scheduled" | "completed" | "cancelled";

export type ActivitySectionRow = {
  id: string;
  institute_id: string;
  domain: ActivityDomain;
  sports_category: SportsCategory | null;
  name: string;
  slug: string;
  description: string | null;
  status: ActivitySectionStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ActivitySectionDto = {
  id: string;
  instituteId: string;
  domain: ActivityDomain;
  sportsCategory: SportsCategory | null;
  name: string;
  slug: string;
  description: string | null;
  status: ActivitySectionStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTeamRow = {
  id: string;
  institute_id: string;
  section_id: string;
  kind: ActivityTeamKind;
  name: string;
  status: ActivityTeamStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ActivityTeamDto = {
  id: string;
  instituteId: string;
  sectionId: string;
  kind: ActivityTeamKind;
  name: string;
  status: ActivityTeamStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityMembershipRow = {
  id: string;
  institute_id: string;
  team_id: string;
  student_id: string;
  role: ActivityMembershipRole;
  status: ActivityMembershipStatus;
  joined_at: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ActivityMembershipDto = {
  id: string;
  instituteId: string;
  teamId: string;
  studentId: string;
  role: ActivityMembershipRole;
  status: ActivityMembershipStatus;
  joinedAt: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AchievementRow = {
  id: string;
  institute_id: string;
  student_id: string;
  section_id: string | null;
  team_id: string | null;
  title: string;
  kind: AchievementKind;
  awarded_on: string;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

export type PracticeSessionRow = {
  id: string;
  institute_id: string;
  team_id: string;
  title: string;
  scheduled_on: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  status: PracticeSessionStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

export type CreateSectionInput = {
  instituteId: string;
  domain: ActivityDomain;
  sportsCategory?: SportsCategory | null;
  name: string;
  slug?: string;
  description?: string | null;
  status?: ActivitySectionStatus;
};

export type UpdateSectionInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sportsCategory?: SportsCategory | null;
  status?: ActivitySectionStatus;
};

export type CreateTeamInput = {
  instituteId: string;
  sectionId: string;
  kind: ActivityTeamKind;
  name: string;
  status?: ActivityTeamStatus;
};

export type UpdateTeamInput = {
  name?: string;
  kind?: ActivityTeamKind;
  status?: ActivityTeamStatus;
};

export type CreateMembershipInput = {
  instituteId: string;
  teamId: string;
  studentId: string;
  role?: ActivityMembershipRole;
};

export type UpdateMembershipInput = {
  role?: ActivityMembershipRole;
  status?: ActivityMembershipStatus;
};

export type CreateAchievementInput = {
  instituteId: string;
  studentId: string;
  sectionId?: string | null;
  teamId?: string | null;
  title: string;
  kind?: AchievementKind;
  awardedOn: string;
  notes?: string | null;
};

export type UpdateAchievementInput = {
  title?: string;
  kind?: AchievementKind;
  awardedOn?: string;
  notes?: string | null;
  sectionId?: string | null;
  teamId?: string | null;
};

export type CreatePracticeSessionInput = {
  instituteId: string;
  teamId: string;
  title: string;
  scheduledOn: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: PracticeSessionStatus;
};

export type UpdatePracticeSessionInput = {
  title?: string;
  scheduledOn?: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: PracticeSessionStatus;
};
