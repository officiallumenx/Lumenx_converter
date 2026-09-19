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
  CalendarEventDto,
  CoachNoteDto,
  CreateCalendarEventInput,
  CreateCoachNoteInput,
  CreateEquipmentInput,
  CreateMatchResultInput,
  CreateMedicalFitnessInput,
  CreateSportsAttendanceInput,
  CreateTeamSelectionInput,
  CreateTournamentInput,
  CreateVenueInput,
  EquipmentDto,
  MatchResultDto,
  MedicalFitnessDto,
  PracticeSessionDto,
  SportsAttendanceDto,
  SportsCategory,
  ActivityDomain,
  TeamSelectionDto,
  TournamentDto,
  UpdateCalendarEventInput,
  UpdateCoachNoteInput,
  UpdateEquipmentInput,
  UpdateMatchResultInput,
  UpdateMedicalFitnessInput,
  UpdateSportsAttendanceInput,
  UpdateTeamSelectionInput,
  UpdateTournamentInput,
  UpdateVenueInput,
  VenueDto,
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
  return client.get<ActivityMembershipDto[]>(`/api/v1/activity/memberships?${query.toString()}`);
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
  return client.get<AchievementDto[]>(`/api/v1/activity/achievements?${query.toString()}`);
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
  return client.get<PracticeSessionDto[]>(`/api/v1/activity/practice-sessions?${query.toString()}`);
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

export async function updatePracticeSession(
  id: string,
  patch: Partial<{
    title: string;
    scheduledOn: string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    notes: string | null;
    status: PracticeSessionDto["status"];
  }>,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PracticeSessionDto> {
  assertApiMode();
  return client.patch<PracticeSessionDto>(`/api/v1/activity/practice-sessions/${id.trim()}`, {
    title: patch.title,
    scheduled_on: patch.scheduledOn,
    start_time: patch.startTime,
    end_time: patch.endTime,
    location: patch.location,
    notes: patch.notes,
    status: patch.status,
  });
}

export async function deletePracticeSession(
  id: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/activity/practice-sessions/${id.trim()}`);
}

function listSportsV2<T>(
  resource: string,
  instituteId: string,
  filter?: [string, string | undefined],
  client: ConnectApiClient = getConnectApiClient(),
): Promise<T[]> {
  assertApiMode();
  assertInstitute(instituteId);
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  if (filter?.[1]) query.set(filter[0], filter[1]);
  return client.get<T[]>(`/api/v1/activity/${resource}?${query.toString()}`);
}

async function deleteSportsV2(
  resource: string,
  id: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/activity/${resource}/${id.trim()}`);
}

export const listVenues = (instituteId: string, client?: ConnectApiClient) =>
  listSportsV2<VenueDto>("venues", instituteId, undefined, client);
export async function createVenue(
  input: CreateVenueInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<VenueDto>("/api/v1/activity/venues", {
    institute_id: input.instituteId.trim(),
    name: input.name,
    venue_type: input.venueType,
    location_notes: input.locationNotes,
    capacity: input.capacity,
    status: input.status,
  });
}
export async function updateVenue(
  id: string,
  input: UpdateVenueInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<VenueDto>(`/api/v1/activity/venues/${id.trim()}`, {
    name: input.name,
    venue_type: input.venueType,
    location_notes: input.locationNotes,
    capacity: input.capacity,
    status: input.status,
  });
}
export const deleteVenue = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("venues", id, client);

export const listEquipment = (instituteId: string, client?: ConnectApiClient) =>
  listSportsV2<EquipmentDto>("equipment", instituteId, undefined, client);
export async function createEquipment(
  input: CreateEquipmentInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<EquipmentDto>("/api/v1/activity/equipment", {
    institute_id: input.instituteId.trim(),
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    condition: input.condition,
    status: input.status,
    notes: input.notes,
  });
}
export async function updateEquipment(
  id: string,
  input: UpdateEquipmentInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<EquipmentDto>(`/api/v1/activity/equipment/${id.trim()}`, input);
}
export const deleteEquipment = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("equipment", id, client);

export const listTournaments = (instituteId: string, client?: ConnectApiClient) =>
  listSportsV2<TournamentDto>("tournaments", instituteId, undefined, client);
export async function createTournament(
  input: CreateTournamentInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<TournamentDto>("/api/v1/activity/tournaments", {
    institute_id: input.instituteId.trim(),
    section_id: input.sectionId,
    venue_id: input.venueId,
    name: input.name,
    sport_label: input.sportLabel,
    tournament_type: input.tournamentType,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: input.status,
    description: input.description,
  });
}
export async function updateTournament(
  id: string,
  input: UpdateTournamentInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<TournamentDto>(`/api/v1/activity/tournaments/${id.trim()}`, {
    section_id: input.sectionId,
    venue_id: input.venueId,
    name: input.name,
    sport_label: input.sportLabel,
    tournament_type: input.tournamentType,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: input.status,
    description: input.description,
  });
}
export const deleteTournament = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("tournaments", id, client);

export const listMatchResults = (
  instituteId: string,
  tournamentId?: string,
  client?: ConnectApiClient,
) =>
  listSportsV2<MatchResultDto>(
    "match-results",
    instituteId,
    ["tournament_id", tournamentId],
    client,
  );
export async function createMatchResult(
  input: CreateMatchResultInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<MatchResultDto>("/api/v1/activity/match-results", {
    institute_id: input.instituteId.trim(),
    tournament_id: input.tournamentId,
    match_label: input.matchLabel,
    played_on: input.playedOn,
    venue_text: input.venueText,
    home_score: input.homeScore,
    away_score: input.awayScore,
    result_status: input.resultStatus,
    notes: input.notes,
  });
}
export async function updateMatchResult(
  id: string,
  input: UpdateMatchResultInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<MatchResultDto>(`/api/v1/activity/match-results/${id.trim()}`, {
    match_label: input.matchLabel,
    played_on: input.playedOn,
    venue_text: input.venueText,
    home_score: input.homeScore,
    away_score: input.awayScore,
    result_status: input.resultStatus,
    notes: input.notes,
  });
}
export const deleteMatchResult = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("match-results", id, client);

export const listCoachNotes = (instituteId: string, teamId?: string, client?: ConnectApiClient) =>
  listSportsV2<CoachNoteDto>("coach-notes", instituteId, ["team_id", teamId], client);
export async function createCoachNote(
  input: CreateCoachNoteInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<CoachNoteDto>("/api/v1/activity/coach-notes", {
    institute_id: input.instituteId.trim(),
    team_id: input.teamId,
    student_id: input.studentId,
    note_date: input.noteDate,
    body: input.body,
    visibility: input.visibility,
  });
}
export async function updateCoachNote(
  id: string,
  input: UpdateCoachNoteInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<CoachNoteDto>(`/api/v1/activity/coach-notes/${id.trim()}`, {
    student_id: input.studentId,
    note_date: input.noteDate,
    body: input.body,
    visibility: input.visibility,
  });
}
export const deleteCoachNote = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("coach-notes", id, client);

export const listSportsAttendance = (
  instituteId: string,
  teamId?: string,
  client?: ConnectApiClient,
) =>
  listSportsV2<SportsAttendanceDto>("sports-attendance", instituteId, ["team_id", teamId], client);
export async function createSportsAttendance(
  input: CreateSportsAttendanceInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<SportsAttendanceDto>("/api/v1/activity/sports-attendance", {
    institute_id: input.instituteId.trim(),
    team_id: input.teamId,
    session_on: input.sessionOn,
    student_id: input.studentId,
    status: input.status,
    notes: input.notes,
  });
}
export async function updateSportsAttendance(
  id: string,
  input: UpdateSportsAttendanceInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<SportsAttendanceDto>(
    `/api/v1/activity/sports-attendance/${id.trim()}`,
    input,
  );
}
export const deleteSportsAttendance = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("sports-attendance", id, client);

export const listTeamSelections = (
  instituteId: string,
  teamId?: string,
  client?: ConnectApiClient,
) => listSportsV2<TeamSelectionDto>("team-selections", instituteId, ["team_id", teamId], client);
export async function createTeamSelection(
  input: CreateTeamSelectionInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<TeamSelectionDto>("/api/v1/activity/team-selections", {
    institute_id: input.instituteId.trim(),
    team_id: input.teamId,
    title: input.title,
    event_on: input.eventOn,
    venue_text: input.venueText,
    status: input.status,
    notes: input.notes,
    member_student_ids: input.memberStudentIds,
  });
}
export async function updateTeamSelection(
  id: string,
  input: UpdateTeamSelectionInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<TeamSelectionDto>(`/api/v1/activity/team-selections/${id.trim()}`, {
    title: input.title,
    event_on: input.eventOn,
    venue_text: input.venueText,
    status: input.status,
    notes: input.notes,
  });
}
export const deleteTeamSelection = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("team-selections", id, client);

export const listMedicalFitness = (
  instituteId: string,
  studentId?: string,
  client?: ConnectApiClient,
) =>
  listSportsV2<MedicalFitnessDto>(
    "medical-fitness",
    instituteId,
    ["student_id", studentId],
    client,
  );
export async function createMedicalFitness(
  input: CreateMedicalFitnessInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<MedicalFitnessDto>("/api/v1/activity/medical-fitness", {
    institute_id: input.instituteId.trim(),
    student_id: input.studentId,
    clearance_status: input.clearanceStatus,
    valid_until: input.validUntil,
    notes: input.notes,
    assessed_on: input.assessedOn,
  });
}
export async function updateMedicalFitness(
  id: string,
  input: UpdateMedicalFitnessInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<MedicalFitnessDto>(`/api/v1/activity/medical-fitness/${id.trim()}`, {
    clearance_status: input.clearanceStatus,
    valid_until: input.validUntil,
    notes: input.notes,
    assessed_on: input.assessedOn,
  });
}
export const deleteMedicalFitness = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("medical-fitness", id, client);

export const listCalendarEvents = (
  instituteId: string,
  teamId?: string,
  client?: ConnectApiClient,
) => listSportsV2<CalendarEventDto>("calendar-events", instituteId, ["team_id", teamId], client);
export async function createCalendarEvent(
  input: CreateCalendarEventInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  assertInstitute(input.instituteId);
  return client.post<CalendarEventDto>("/api/v1/activity/calendar-events", {
    institute_id: input.instituteId.trim(),
    section_id: input.sectionId,
    team_id: input.teamId,
    title: input.title,
    event_on: input.eventOn,
    start_time: input.startTime,
    end_time: input.endTime,
    venue_text: input.venueText,
    event_kind: input.eventKind,
    source_ref: input.sourceRef,
  });
}
export async function updateCalendarEvent(
  id: string,
  input: UpdateCalendarEventInput,
  client: ConnectApiClient = getConnectApiClient(),
) {
  assertApiMode();
  return client.patch<CalendarEventDto>(`/api/v1/activity/calendar-events/${id.trim()}`, {
    section_id: input.sectionId,
    team_id: input.teamId,
    title: input.title,
    event_on: input.eventOn,
    start_time: input.startTime,
    end_time: input.endTime,
    venue_text: input.venueText,
    event_kind: input.eventKind,
    source_ref: input.sourceRef,
  });
}
export const deleteCalendarEvent = (id: string, client?: ConnectApiClient) =>
  deleteSportsV2("calendar-events", id, client);
