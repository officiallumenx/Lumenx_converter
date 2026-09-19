import { isApiAuthMode } from "@/auth/auth-mode";
import { getActivityApiInstituteId } from "../context";
import {
  getSportsV2ApiSnapshot,
  resetSportsV2ApiStore,
  sportsV2ApiStore,
} from "../sports-v2-api-store";
import {
  mapCoachNoteDto,
  mapMatchResultDto,
  mapPracticeSessionDto,
  mapSportsAttendanceDto,
  mapTournamentDto,
} from "../sports-v2-map";
import {
  cloneSportsTeam,
  createTeamFromInput,
  createTeamFromGroupInput,
  sportTeamsSeed,
  sportsDashboardSnapshot,
} from "./mock-data";
import { createSectionInStore, listSectionsFromStore } from "./sections-store";
import type { SportsProgramSection, SportsProgramSectionInput } from "./sections-types";
import {
  archiveActivityInStore,
  activitiesToCalendarMarks,
  cancelActivityInStore,
  createActivityInStore,
  duplicateActivityInStore,
  getActivityByIdFromStore,
  listActivitiesFromStore,
  listCoordinatorOptions,
  publishActivityInStore,
  resetActivitiesStore,
  updateActivityInStore,
} from "./activities-store";
import {
  archivePracticeSessionInStore,
  cancelPracticeSessionInStore,
  createPracticeSessionInStore,
  duplicatePracticeSessionInStore,
  getPracticeSessionByIdFromStore,
  listPracticeCoachOptions,
  listPracticeSessionsFromStore,
  resetPracticeSessionsStore,
  updatePracticeSessionInStore,
} from "./practice-sessions-store";
import { buildSportsCalendarMarks } from "./sports-calendar";
import {
  completeSessionAttendanceInStore,
  createAttendanceInStore,
  getAttendanceByIdFromStore,
  isSessionAttendanceCompleted,
  listAttendanceFromStore,
  listEligiblePracticeSessionOptions,
  resetSportsAttendanceStore,
  updateAttendanceInStore,
} from "./sports-attendance-store";
import {
  createCoachNoteInStore,
  getCoachNoteByIdFromStore,
  listCoachNotesFromStore,
  listCoachOptions,
  listEligibleAttendanceOptions,
  markFollowUpNotifiedInStore,
  resetCoachNotesStore,
  updateCoachNoteInStore,
} from "./coach-notes-store";
import {
  addMatchToTournamentInStore,
  archiveTournamentInStore,
  cancelTournamentInStore,
  createTournamentInStore,
  duplicateTournamentInStore,
  getTournamentByIdFromStore,
  getTournamentsCalendarMarks,
  listTournamentsFromStore,
  publishTournamentInStore,
  removeMatchFromTournamentInStore,
  resetTournamentsStore,
  updateMatchInTournamentInStore,
  updateTournamentInStore,
} from "./tournaments-store";
import { computeCoachNoteSummary } from "./coach-notes-summary";
import type {
  CoachNoteRecord,
  CoachNoteInput,
  CoachNoteListFilters,
  CoachNoteSummary,
} from "./coach-notes-types";
import {
  createMatchResultInStore,
  getMatchResultByIdFromStore,
  listEligibleTournamentMatchOptions,
  listMatchResultsFromStore,
  listTournamentFilterOptions,
  listWinnerFilterOptions,
  publishMatchResultInStore,
  resetMatchResultsStore,
  updateMatchResultInStore,
} from "./match-results-store";
import type { MatchResult, MatchResultInput, MatchResultListFilters } from "./match-results-types";
import type {
  SportsTournament,
  SportsTournamentInput,
  TournamentListFilters,
  TournamentMatchInput,
  TournamentMatch,
} from "./tournaments-types";
import { computeAttendanceSummary } from "./sports-attendance-summary";
import type {
  SportsAttendanceRecord,
  SportsAttendanceInput,
  SportsAttendanceListFilters,
  SportsAttendanceSummary,
} from "./sports-attendance-types";
import type {
  SportsActivity,
  SportsActivityInput,
  SportsActivityListFilters,
} from "./activities-types";
import type {
  PracticeSession,
  PracticeSessionInput,
  PracticeSessionListFilters,
} from "./practice-sessions-types";
import type {
  SportsTeam,
  SportsTeamInput,
  SportsTeamGroupInput,
  SportsTeamListFilters,
  SportsDashboardSnapshot,
  SportType,
} from "./types";

import { SPORT_TYPE_LABELS } from "./types";
import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function requireApiInstitute(): string {
  const instituteId = getActivityApiInstituteId();
  if (!instituteId) throw new Error("Activity API context is not configured");
  return instituteId;
}

function unsupported(operation: string): never {
  throw new Error(`${operation} is not supported by the activity API`);
}

function apiPracticeStatus(status: PracticeSession["status"] | undefined) {
  if (!status) return undefined;
  if (status === "in_progress" || status === "archived") {
    return unsupported(`Practice session status "${status}"`);
  }
  return status;
}

function parseScore(score: string): [number | null, number | null] {
  const parts = score.split(/[-:]/).map((part) => Number(part.trim()));
  return parts.length === 2 && parts.every(Number.isFinite) ? [parts[0], parts[1]] : [null, null];
}

let dashboardStore: SportsDashboardSnapshot = { ...sportsDashboardSnapshot };
let teamsStore: SportsTeam[] = isApiAuthMode() ? [] : sportTeamsSeed.map(cloneSportsTeam);

function applyTeamFilters(teams: SportsTeam[], filters?: SportsTeamListFilters): SportsTeam[] {
  let result = [...teams];
  const f = filters ?? {};

  if (f.sectionId) {
    result = result.filter((t) => t.sectionId === f.sectionId);
  }
  if (f.status && f.status !== "all") {
    result = result.filter((t) => t.status === f.status);
  }
  if (f.sportType && f.sportType !== "all") {
    result = result.filter((t) => t.sportType === f.sportType);
  }
  if (f.gender && f.gender !== "all") {
    result = result.filter((t) => t.gender === f.gender);
  }
  if (f.ageCategory && f.ageCategory !== "all") {
    result = result.filter((t) => t.ageCategory === f.ageCategory);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.coach.toLowerCase().includes(q) ||
        t.captain.toLowerCase().includes(q) ||
        SPORT_TYPE_LABELS[t.sportType].toLowerCase().includes(q) ||
        (t.house?.toLowerCase().includes(q) ?? false),
    );
  }

  const sortBy = f.sortBy ?? "name";
  const sortDir = f.sortDir ?? "asc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    switch (sortBy) {
      case "sport":
        return dir * SPORT_TYPE_LABELS[a.sportType].localeCompare(SPORT_TYPE_LABELS[b.sportType]);
      case "members":
        return dir * (a.stats.totalMembers - b.stats.totalMembers);
      case "wins":
        return dir * (a.stats.wins - b.stats.wins);
      case "updatedAt":
        return dir * a.updatedAt.localeCompare(b.updatedAt);
      default:
        return dir * a.name.localeCompare(b.name);
    }
  });

  return result;
}

export const sportsRepository = {
  async listSections(): Promise<SportsProgramSection[]> {
    await delay(120);
    return listSectionsFromStore();
  },
  getSectionsSnapshot(): SportsProgramSection[] {
    return listSectionsFromStore();
  },
  async createSection(input: SportsProgramSectionInput): Promise<SportsProgramSection> {
    await delay(200);
    return createSectionInStore(input);
  },

  async getDashboard(): Promise<SportsDashboardSnapshot> {
    await delay();
    return dashboardStore;
  },
  getDashboardSnapshot(): SportsDashboardSnapshot {
    return dashboardStore;
  },

  async listTeams(filters?: SportsTeamListFilters): Promise<SportsTeam[]> {
    await delay();
    return applyTeamFilters(teamsStore, filters);
  },
  getTeamsSnapshot(): SportsTeam[] {
    return teamsStore.map(cloneSportsTeam);
  },
  async getTeamById(id: string): Promise<SportsTeam | null> {
    await delay(120);
    const team = teamsStore.find((t) => t.id === id);
    return team ? cloneSportsTeam(team) : null;
  },
  async createTeam(input: SportsTeamInput): Promise<SportsTeam> {
    if (isApiAuthMode()) unsupported("Sports team creation from this screen");
    await delay(280);
    const team = createTeamFromInput(input);
    teamsStore = [team, ...teamsStore];
    return cloneSportsTeam(team);
  },
  async createTeamGroup(input: SportsTeamGroupInput): Promise<SportsTeam> {
    if (isApiAuthMode()) unsupported("Sports team-group creation from this screen");
    await delay(280);
    const team = createTeamFromGroupInput(input);
    teamsStore = [team, ...teamsStore];
    return cloneSportsTeam(team);
  },
  async updateTeam(id: string, input: Partial<SportsTeamInput>): Promise<SportsTeam> {
    if (isApiAuthMode()) unsupported("Sports team editing from this screen");
    await delay(280);
    const idx = teamsStore.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error("Sports team not found");
    const prev = teamsStore[idx];
    const updated: SportsTeam = cloneSportsTeam({
      ...prev,
      ...input,
      name: input.name?.trim() ?? prev.name,
      description: input.description?.trim() ?? prev.description,
      coach: input.coach?.trim() ?? prev.coach,
      captain: input.captain?.trim() ?? prev.captain,
      assistantCoach: input.assistantCoach?.trim() || prev.assistantCoach,
      house: input.house?.trim() || prev.house,
      logoEmoji: input.logoEmoji ?? prev.logoEmoji,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    teamsStore = teamsStore.map((t) => (t.id === id ? updated : t));
    return cloneSportsTeam(updated);
  },
  async archiveTeam(id: string): Promise<SportsTeam> {
    if (isApiAuthMode()) unsupported("Sports team archiving from this screen");
    await delay(220);
    const idx = teamsStore.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error("Sports team not found");
    const archived: SportsTeam = {
      ...cloneSportsTeam(teamsStore[idx]),
      status: "archived",
      archivedAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    teamsStore = teamsStore.map((t) => (t.id === id ? archived : t));
    return cloneSportsTeam(archived);
  },

  async listActivities(filters?: SportsActivityListFilters): Promise<SportsActivity[]> {
    await delay();
    return listActivitiesFromStore(filters);
  },
  getActivitiesSnapshot(): SportsActivity[] {
    return listActivitiesFromStore();
  },
  async getActivityById(id: string): Promise<SportsActivity | null> {
    await delay(120);
    return getActivityByIdFromStore(id);
  },
  async createActivity(input: SportsActivityInput): Promise<SportsActivity> {
    if (isApiAuthMode()) unsupported("Sports activity creation");
    await delay(280);
    return createActivityInStore(input);
  },
  async updateActivity(
    id: string,
    patch: Partial<SportsActivityInput> & { status?: SportsActivity["status"] },
  ): Promise<SportsActivity> {
    if (isApiAuthMode()) unsupported("Sports activity editing");
    await delay(280);
    return updateActivityInStore(id, patch);
  },
  async duplicateActivity(id: string): Promise<SportsActivity> {
    if (isApiAuthMode()) unsupported("Sports activity duplication");
    await delay(240);
    return duplicateActivityInStore(id);
  },
  async publishActivity(id: string): Promise<SportsActivity> {
    if (isApiAuthMode()) unsupported("Sports activity publishing");
    await delay(220);
    return publishActivityInStore(id);
  },
  async cancelActivity(id: string): Promise<SportsActivity> {
    if (isApiAuthMode()) unsupported("Sports activity cancellation");
    await delay(220);
    return cancelActivityInStore(id);
  },
  async archiveActivity(id: string): Promise<SportsActivity> {
    if (isApiAuthMode()) unsupported("Sports activity archiving");
    await delay(220);
    return archiveActivityInStore(id);
  },
  async getActivitiesCalendarMarks(): Promise<CalendarActivityMark[]> {
    await delay(80);
    return activitiesToCalendarMarks(listActivitiesFromStore());
  },
  async listActivityCoordinatorOptions(): Promise<string[]> {
    await delay(60);
    return listCoordinatorOptions();
  },
  listActiveTeamOptions(): { id: string; name: string }[] {
    return teamsStore.filter((t) => t.status === "active").map((t) => ({ id: t.id, name: t.name }));
  },

  async listPracticeSessions(filters?: PracticeSessionListFilters): Promise<PracticeSession[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listPracticeSessions();
      return rows.filter((row) => {
        if (filters?.teamId && filters.teamId !== "all" && row.teamId !== filters.teamId)
          return false;
        if (filters?.status && filters.status !== "all" && row.status !== filters.status)
          return false;
        if (filters?.date && filters.date !== "all" && row.date !== filters.date) return false;
        const query = filters?.query?.trim().toLowerCase();
        return !query || `${row.title} ${row.venue} ${row.notes}`.toLowerCase().includes(query);
      });
    }
    await delay();
    return listPracticeSessionsFromStore(filters);
  },
  getPracticeSessionsSnapshot(): PracticeSession[] {
    if (isApiAuthMode())
      return getSportsV2ApiSnapshot().practiceSessions.map(mapPracticeSessionDto);
    return listPracticeSessionsFromStore();
  },
  async getPracticeSessionById(id: string): Promise<PracticeSession | null> {
    if (isApiAuthMode()) {
      return (await sportsV2ApiStore.listPracticeSessions()).find((row) => row.id === id) ?? null;
    }
    await delay(120);
    return getPracticeSessionByIdFromStore(id);
  },
  async createPracticeSession(input: PracticeSessionInput): Promise<PracticeSession> {
    if (isApiAuthMode()) {
      return mapPracticeSessionDto(
        await sportsV2ApiStore.createPracticeSession({
          instituteId: requireApiInstitute(),
          teamId: input.teamId,
          title: input.title,
          scheduledOn: input.date,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          location: input.venue || null,
          notes: input.notes || null,
        }),
      );
    }
    await delay(280);
    return createPracticeSessionInStore(input, this.listActiveTeamOptions());
  },
  async updatePracticeSession(
    id: string,
    patch: Partial<PracticeSessionInput> & { status?: PracticeSession["status"] },
  ): Promise<PracticeSession> {
    if (isApiAuthMode()) {
      return mapPracticeSessionDto(
        await sportsV2ApiStore.updatePracticeSession(id, {
          title: patch.title,
          scheduledOn: patch.date,
          startTime: patch.startTime,
          endTime: patch.endTime,
          location: patch.venue,
          notes: patch.notes,
          status: apiPracticeStatus(patch.status),
        }),
      );
    }
    await delay(280);
    return updatePracticeSessionInStore(id, patch, this.listActiveTeamOptions());
  },
  async duplicatePracticeSession(id: string): Promise<PracticeSession> {
    if (isApiAuthMode()) unsupported("Practice session duplication");
    await delay(240);
    return duplicatePracticeSessionInStore(id, this.listActiveTeamOptions());
  },
  async cancelPracticeSession(id: string): Promise<PracticeSession> {
    if (isApiAuthMode()) {
      return mapPracticeSessionDto(
        await sportsV2ApiStore.updatePracticeSession(id, { status: "cancelled" }),
      );
    }
    await delay(220);
    return cancelPracticeSessionInStore(id);
  },
  async archivePracticeSession(id: string): Promise<PracticeSession> {
    if (isApiAuthMode()) unsupported("Practice session archiving");
    await delay(220);
    return archivePracticeSessionInStore(id);
  },
  async getSportsCalendarMarks(): Promise<CalendarActivityMark[]> {
    await delay(80);
    return buildSportsCalendarMarks();
  },
  async listPracticeCoachOptions(): Promise<string[]> {
    await delay(60);
    return listPracticeCoachOptions();
  },
  /** Parent activities available for practice session linking — excludes archived. */
  listParentActivityOptions(): { id: string; title: string; linkedTeamIds: string[] }[] {
    return listActivitiesFromStore({ status: "all" })
      .filter((a) => a.status !== "archived")
      .map((a) => ({
        id: a.id,
        title: a.title,
        linkedTeamIds: a.linkedTeamIds,
      }));
  },

  async listAttendance(filters?: SportsAttendanceListFilters): Promise<SportsAttendanceRecord[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listAttendance();
      return rows.filter((row) => {
        if (filters?.teamId && filters.teamId !== "all" && row.teamId !== filters.teamId)
          return false;
        if (
          filters?.studentId &&
          filters.studentId !== "all" &&
          row.studentId !== filters.studentId
        )
          return false;
        if (filters?.status && filters.status !== "all" && row.status !== filters.status)
          return false;
        if (filters?.date && filters.date !== "all" && row.sessionDate !== filters.date)
          return false;
        return true;
      });
    }
    await delay();
    return listAttendanceFromStore(filters);
  },
  getAttendanceSnapshot(): SportsAttendanceRecord[] {
    if (isApiAuthMode()) return getSportsV2ApiSnapshot().attendance.map(mapSportsAttendanceDto);
    return listAttendanceFromStore();
  },
  async getAttendanceById(id: string): Promise<SportsAttendanceRecord | null> {
    if (isApiAuthMode())
      return (await sportsV2ApiStore.listAttendance()).find((row) => row.id === id) ?? null;
    await delay(120);
    return getAttendanceByIdFromStore(id);
  },
  async createAttendance(input: SportsAttendanceInput): Promise<SportsAttendanceRecord> {
    if (isApiAuthMode()) {
      const session = getSportsV2ApiSnapshot().practiceSessions.find(
        (row) => row.id === input.practiceSessionId,
      );
      if (!session) throw new Error("Practice session must be loaded before recording attendance");
      return mapSportsAttendanceDto(
        await sportsV2ApiStore.createAttendance({
          instituteId: requireApiInstitute(),
          teamId: session.teamId,
          sessionOn: session.scheduledOn,
          studentId: input.studentId,
          status: input.status,
          notes: input.remarks || null,
        }),
      );
    }
    await delay(280);
    return createAttendanceInStore(input);
  },
  async updateAttendance(
    id: string,
    patch: Partial<SportsAttendanceInput>,
  ): Promise<SportsAttendanceRecord> {
    if (isApiAuthMode()) {
      return mapSportsAttendanceDto(
        await sportsV2ApiStore.updateAttendance(id, {
          status: patch.status,
          notes: patch.remarks,
        }),
      );
    }
    await delay(280);
    return updateAttendanceInStore(id, patch);
  },
  getAttendanceSummary(filters?: SportsAttendanceListFilters): SportsAttendanceSummary {
    if (isApiAuthMode()) {
      const rows = getSportsV2ApiSnapshot().attendance.map(mapSportsAttendanceDto);
      return computeAttendanceSummary(
        rows.filter(
          (row) =>
            (!filters?.teamId || filters.teamId === "all" || row.teamId === filters.teamId) &&
            (!filters?.status || filters.status === "all" || row.status === filters.status),
        ),
      );
    }
    return computeAttendanceSummary(listAttendanceFromStore(filters));
  },
  async completeSessionAttendance(
    sessionId: string,
  ): Promise<{ sessionId: string; recordCount: number }> {
    if (isApiAuthMode()) unsupported("Completing session attendance");
    await delay(220);
    return completeSessionAttendanceInStore(sessionId);
  },
  isSessionAttendanceCompleted(sessionId: string): boolean {
    if (isApiAuthMode()) return false;
    return isSessionAttendanceCompleted(sessionId);
  },
  listEligiblePracticeSessionOptions(): ReturnType<typeof listEligiblePracticeSessionOptions> {
    return listEligiblePracticeSessionOptions();
  },

  async listCoachNotes(filters?: CoachNoteListFilters): Promise<CoachNoteRecord[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listCoachNotes();
      return rows.filter(
        (row) =>
          (!filters?.teamId || filters.teamId === "all" || row.teamId === filters.teamId) &&
          (!filters?.studentId ||
            filters.studentId === "all" ||
            row.studentId === filters.studentId),
      );
    }
    await delay();
    return listCoachNotesFromStore(filters);
  },
  getCoachNotesSnapshot(): CoachNoteRecord[] {
    if (isApiAuthMode()) return getSportsV2ApiSnapshot().coachNotes.map(mapCoachNoteDto);
    return listCoachNotesFromStore();
  },
  async getCoachNoteById(id: string): Promise<CoachNoteRecord | null> {
    if (isApiAuthMode())
      return (await sportsV2ApiStore.listCoachNotes()).find((row) => row.id === id) ?? null;
    await delay(120);
    return getCoachNoteByIdFromStore(id);
  },
  async createCoachNote(input: CoachNoteInput): Promise<CoachNoteRecord> {
    if (isApiAuthMode()) {
      const attendance = getSportsV2ApiSnapshot().attendance.find(
        (row) => row.id === input.attendanceRecordId,
      );
      if (!attendance)
        throw new Error("Attendance record must be loaded before creating a coach note");
      return mapCoachNoteDto(
        await sportsV2ApiStore.createCoachNote({
          instituteId: requireApiInstitute(),
          teamId: attendance.teamId,
          studentId: attendance.studentId,
          noteDate: attendance.sessionOn,
          body: input.coachNotes,
          visibility: "staff",
        }),
      );
    }
    await delay(280);
    return createCoachNoteInStore(input);
  },
  async updateCoachNote(id: string, patch: Partial<CoachNoteInput>): Promise<CoachNoteRecord> {
    if (isApiAuthMode()) {
      return mapCoachNoteDto(
        await sportsV2ApiStore.updateCoachNote(id, {
          body: patch.coachNotes,
        }),
      );
    }
    await delay(280);
    return updateCoachNoteInStore(id, patch);
  },
  getCoachNoteSummary(filters?: CoachNoteListFilters): CoachNoteSummary {
    if (isApiAuthMode())
      return computeCoachNoteSummary(getSportsV2ApiSnapshot().coachNotes.map(mapCoachNoteDto));
    return computeCoachNoteSummary(listCoachNotesFromStore(filters));
  },
  async sendFollowUpNotification(id: string): Promise<CoachNoteRecord> {
    if (isApiAuthMode()) unsupported("Coach-note follow-up notifications");
    await delay(220);
    return markFollowUpNotifiedInStore(id);
  },
  async listCoachNoteCoachOptions(): Promise<string[]> {
    await delay(60);
    return listCoachOptions();
  },
  listEligibleAttendanceForCoachNotes(): ReturnType<typeof listEligibleAttendanceOptions> {
    return listEligibleAttendanceOptions();
  },

  async listTournaments(filters?: TournamentListFilters): Promise<SportsTournament[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listTournaments();
      return rows.filter(
        (row) =>
          (!filters?.status || filters.status === "all" || row.status === filters.status) &&
          (!filters?.sportType ||
            filters.sportType === "all" ||
            row.sportType === filters.sportType),
      );
    }
    await delay();
    return listTournamentsFromStore(filters);
  },
  getTournamentsSnapshot(): SportsTournament[] {
    if (isApiAuthMode()) return getSportsV2ApiSnapshot().tournaments.map(mapTournamentDto);
    return listTournamentsFromStore();
  },
  async getTournamentById(id: string): Promise<SportsTournament | null> {
    if (isApiAuthMode())
      return (await sportsV2ApiStore.listTournaments()).find((row) => row.id === id) ?? null;
    await delay(120);
    return getTournamentByIdFromStore(id);
  },
  async createTournament(input: SportsTournamentInput): Promise<SportsTournament> {
    if (isApiAuthMode()) {
      return mapTournamentDto(
        await sportsV2ApiStore.createTournament({
          instituteId: requireApiInstitute(),
          sectionId: null,
          venueId: null,
          name: input.name,
          sportLabel: input.sportType,
          tournamentType: input.tournamentType,
          startsOn: input.startDate || null,
          endsOn: input.endDate || null,
          status: "draft",
          description: input.description || null,
        }),
      );
    }
    await delay(280);
    return createTournamentInStore(input);
  },
  async updateTournament(
    id: string,
    patch: Partial<SportsTournamentInput> & { status?: SportsTournament["status"] },
  ): Promise<SportsTournament> {
    if (isApiAuthMode()) {
      return mapTournamentDto(
        await sportsV2ApiStore.updateTournament(id, {
          name: patch.name,
          sportLabel: patch.sportType,
          tournamentType: patch.tournamentType,
          startsOn: patch.startDate,
          endsOn: patch.endDate,
          status: patch.status,
          description: patch.description,
        }),
      );
    }
    await delay(280);
    return updateTournamentInStore(id, patch);
  },
  async duplicateTournament(id: string): Promise<SportsTournament> {
    if (isApiAuthMode()) unsupported("Tournament duplication");
    await delay(240);
    return duplicateTournamentInStore(id);
  },
  async publishTournament(id: string): Promise<SportsTournament> {
    if (isApiAuthMode()) {
      return mapTournamentDto(await sportsV2ApiStore.updateTournament(id, { status: "scheduled" }));
    }
    await delay(220);
    return publishTournamentInStore(id);
  },
  async cancelTournament(id: string): Promise<SportsTournament> {
    if (isApiAuthMode()) {
      return mapTournamentDto(await sportsV2ApiStore.updateTournament(id, { status: "cancelled" }));
    }
    await delay(220);
    return cancelTournamentInStore(id);
  },
  async archiveTournament(id: string): Promise<SportsTournament> {
    if (isApiAuthMode()) {
      return mapTournamentDto(await sportsV2ApiStore.updateTournament(id, { status: "archived" }));
    }
    await delay(220);
    return archiveTournamentInStore(id);
  },
  async addTournamentMatch(
    tournamentId: string,
    input: TournamentMatchInput,
  ): Promise<SportsTournament> {
    if (isApiAuthMode()) unsupported("Nested tournament matches");
    await delay(200);
    return addMatchToTournamentInStore(tournamentId, input);
  },
  async updateTournamentMatch(
    tournamentId: string,
    matchId: string,
    patch: Partial<TournamentMatchInput> & { status?: TournamentMatch["status"] },
  ): Promise<SportsTournament> {
    if (isApiAuthMode()) unsupported("Nested tournament matches");
    await delay(200);
    return updateMatchInTournamentInStore(tournamentId, matchId, patch);
  },
  async removeTournamentMatch(tournamentId: string, matchId: string): Promise<SportsTournament> {
    if (isApiAuthMode()) unsupported("Nested tournament matches");
    await delay(180);
    return removeMatchFromTournamentInStore(tournamentId, matchId);
  },
  async getTournamentsCalendarMarks(): Promise<CalendarActivityMark[]> {
    await delay(80);
    return getTournamentsCalendarMarks();
  },

  async listMatchResults(filters?: MatchResultListFilters): Promise<MatchResult[]> {
    if (isApiAuthMode()) {
      const rows = await sportsV2ApiStore.listMatchResults();
      return rows.filter(
        (row) =>
          (!filters?.tournamentId ||
            filters.tournamentId === "all" ||
            row.tournamentId === filters.tournamentId) &&
          (!filters?.matchStatus ||
            filters.matchStatus === "all" ||
            row.matchStatus === filters.matchStatus),
      );
    }
    await delay();
    return listMatchResultsFromStore(filters);
  },
  getMatchResultsSnapshot(): MatchResult[] {
    if (isApiAuthMode()) return getSportsV2ApiSnapshot().matchResults.map(mapMatchResultDto);
    return listMatchResultsFromStore();
  },
  async getMatchResultById(id: string): Promise<MatchResult | null> {
    if (isApiAuthMode())
      return (await sportsV2ApiStore.listMatchResults()).find((row) => row.id === id) ?? null;
    await delay(120);
    return getMatchResultByIdFromStore(id);
  },
  async createMatchResult(input: MatchResultInput): Promise<MatchResult> {
    if (isApiAuthMode()) unsupported("Creating match results from the legacy nested-match form");
    await delay(280);
    return createMatchResultInStore(input);
  },
  async updateMatchResult(id: string, patch: Partial<MatchResultInput>): Promise<MatchResult> {
    if (isApiAuthMode()) {
      const [homeScore, awayScore] = patch.finalScore
        ? parseScore(patch.finalScore)
        : [undefined, undefined];
      return mapMatchResultDto(
        await sportsV2ApiStore.updateMatchResult(id, {
          homeScore,
          awayScore,
          resultStatus: patch.matchStatus === "abandoned" ? "cancelled" : patch.matchStatus,
          notes: patch.matchSummary,
        }),
      );
    }
    await delay(280);
    return updateMatchResultInStore(id, patch);
  },
  async publishMatchResult(id: string): Promise<MatchResult> {
    if (isApiAuthMode()) unsupported("Match-result publishing");
    await delay(220);
    return publishMatchResultInStore(id);
  },
  listEligibleTournamentMatchOptions(): ReturnType<typeof listEligibleTournamentMatchOptions> {
    return listEligibleTournamentMatchOptions();
  },
  listMatchResultTournamentOptions(): ReturnType<typeof listTournamentFilterOptions> {
    return listTournamentFilterOptions();
  },
  listMatchResultWinnerOptions(): string[] {
    return listWinnerFilterOptions();
  },

  reset() {
    dashboardStore = { ...sportsDashboardSnapshot };
    teamsStore = isApiAuthMode() ? [] : sportTeamsSeed.map(cloneSportsTeam);
    resetActivitiesStore();
    resetPracticeSessionsStore();
    resetSportsAttendanceStore();
    resetCoachNotesStore();
    resetTournamentsStore();
    resetMatchResultsStore();
    if (isApiAuthMode()) resetSportsV2ApiStore();
  },
};

export type { SportType };
