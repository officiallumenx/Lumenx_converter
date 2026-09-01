import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  AchievementDto,
  ActivityMembershipDto,
  ActivitySectionDto,
  ActivityTeamDto,
  ActivityTeamRecipientsDto,
  PracticeSessionDto,
  SportsCategory,
  ActivityDomain,
} from "./api-types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Activity API is only available in API auth mode");
  }
}

function assertInstitute(instituteId: string): void {
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
}

export async function listActivitySections(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivitySectionDto[]> {
  assertApiMode();
  assertInstitute(instituteId);
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  return client.get<ActivitySectionDto[]>(`/api/v1/activity/sections?${query}`);
}

export async function createActivitySection(
  input: {
    instituteId: string;
    domain: ActivityDomain;
    sportsCategory?: SportsCategory | null;
    name: string;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivitySectionDto> {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<ActivitySectionDto>("/api/v1/activity/sections", {
    institute_id: input.instituteId.trim(),
    domain: input.domain,
    sports_category: input.sportsCategory ?? null,
    name: input.name.trim(),
    status: "active",
  });
}

export async function listActivityTeams(
  instituteId: string,
  sectionId?: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivityTeamDto[]> {
  assertApiMode();
  assertInstitute(instituteId);
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  if (sectionId) query.set("section_id", sectionId);
  return client.get<ActivityTeamDto[]>(`/api/v1/activity/teams?${query.toString()}`);
}

export async function createActivityTeam(
  input: {
    instituteId: string;
    sectionId: string;
    kind: "team" | "group";
    name: string;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivityTeamDto> {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<ActivityTeamDto>("/api/v1/activity/teams", {
    institute_id: input.instituteId.trim(),
    section_id: input.sectionId.trim(),
    kind: input.kind,
    name: input.name.trim(),
    status: "active",
  });
}

export async function listActivityMemberships(
  instituteId: string,
  teamId?: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivityMembershipDto[]> {
  assertApiMode();
  assertInstitute(instituteId);
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  if (teamId) query.set("team_id", teamId);
  return client.get<ActivityMembershipDto[]>(
    `/api/v1/activity/memberships?${query.toString()}`,
  );
}

export async function createActivityMembership(
  input: { instituteId: string; teamId: string; studentId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivityMembershipDto> {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<ActivityMembershipDto>("/api/v1/activity/memberships", {
    institute_id: input.instituteId.trim(),
    team_id: input.teamId.trim(),
    student_id: input.studentId.trim(),
  });
}

export async function deleteActivityMembership(
  membershipId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/activity/memberships/${membershipId.trim()}`);
}

export async function getActivityTeamRecipients(
  teamId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ActivityTeamRecipientsDto> {
  assertApiMode();
  return client.get<ActivityTeamRecipientsDto>(
    `/api/v1/activity/teams/${teamId.trim()}/recipients`,
  );
}

export async function listAchievements(
  instituteId: string,
  studentId?: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AchievementDto[]> {
  assertApiMode();
  assertInstitute(instituteId);
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  if (studentId) query.set("student_id", studentId);
  return client.get<AchievementDto[]>(
    `/api/v1/activity/achievements?${query.toString()}`,
  );
}

export async function createAchievement(
  input: {
    instituteId: string;
    studentId: string;
    teamId?: string | null;
    sectionId?: string | null;
    title: string;
    awardedOn: string;
    kind?: AchievementDto["kind"];
    notes?: string | null;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AchievementDto> {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<AchievementDto>("/api/v1/activity/achievements", {
    institute_id: input.instituteId.trim(),
    student_id: input.studentId.trim(),
    team_id: input.teamId ?? null,
    section_id: input.sectionId ?? null,
    title: input.title.trim(),
    awarded_on: input.awardedOn,
    kind: input.kind ?? "award",
    notes: input.notes ?? null,
  });
}

export async function listPracticeSessions(
  instituteId: string,
  teamId?: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PracticeSessionDto[]> {
  assertApiMode();
  assertInstitute(instituteId);
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  if (teamId) query.set("team_id", teamId);
  return client.get<PracticeSessionDto[]>(
    `/api/v1/activity/practice-sessions?${query.toString()}`,
  );
}

export async function createPracticeSession(
  input: {
    instituteId: string;
    teamId: string;
    title: string;
    scheduledOn: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    notes?: string | null;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PracticeSessionDto> {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<PracticeSessionDto>("/api/v1/activity/practice-sessions", {
    institute_id: input.instituteId.trim(),
    team_id: input.teamId.trim(),
    title: input.title.trim(),
    scheduled_on: input.scheduledOn,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    location: input.location ?? null,
    notes: input.notes ?? null,
    status: "scheduled",
  });
}
