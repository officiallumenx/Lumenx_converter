import {
  cloneSportsTeam,
  createTeamFromInput,
  createTeamFromGroupInput,
  sportTeamsSeed,
  sportsDashboardSnapshot,
} from "./mock-data";
import {
  createSectionInStore,
  listSectionsFromStore,
} from "./sections-store";
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
import type {
  MatchResult,
  MatchResultInput,
  MatchResultListFilters,
} from "./match-results-types";
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

let dashboardStore: SportsDashboardSnapshot = { ...sportsDashboardSnapshot };
let teamsStore: SportsTeam[] = sportTeamsSeed.map(cloneSportsTeam);

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
    await delay(280);
    const team = createTeamFromInput(input);
    teamsStore = [team, ...teamsStore];
    return cloneSportsTeam(team);
  },
  async createTeamGroup(input: SportsTeamGroupInput): Promise<SportsTeam> {
    await delay(280);
    const team = createTeamFromGroupInput(input);
    teamsStore = [team, ...teamsStore];
    return cloneSportsTeam(team);
  },
  async updateTeam(id: string, input: Partial<SportsTeamInput>): Promise<SportsTeam> {
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
    await delay(280);
    return createActivityInStore(input);
  },
  async updateActivity(
    id: string,
    patch: Partial<SportsActivityInput> & { status?: SportsActivity["status"] },
  ): Promise<SportsActivity> {
    await delay(280);
    return updateActivityInStore(id, patch);
  },
  async duplicateActivity(id: string): Promise<SportsActivity> {
    await delay(240);
    return duplicateActivityInStore(id);
  },
  async publishActivity(id: string): Promise<SportsActivity> {
    await delay(220);
    return publishActivityInStore(id);
  },
  async cancelActivity(id: string): Promise<SportsActivity> {
    await delay(220);
    return cancelActivityInStore(id);
  },
  async archiveActivity(id: string): Promise<SportsActivity> {
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
    return teamsStore
      .filter((t) => t.status === "active")
      .map((t) => ({ id: t.id, name: t.name }));
  },

  async listPracticeSessions(filters?: PracticeSessionListFilters): Promise<PracticeSession[]> {
    await delay();
    return listPracticeSessionsFromStore(filters);
  },
  getPracticeSessionsSnapshot(): PracticeSession[] {
    return listPracticeSessionsFromStore();
  },
  async getPracticeSessionById(id: string): Promise<PracticeSession | null> {
    await delay(120);
    return getPracticeSessionByIdFromStore(id);
  },
  async createPracticeSession(input: PracticeSessionInput): Promise<PracticeSession> {
    await delay(280);
    return createPracticeSessionInStore(input, this.listActiveTeamOptions());
  },
  async updatePracticeSession(
    id: string,
    patch: Partial<PracticeSessionInput> & { status?: PracticeSession["status"] },
  ): Promise<PracticeSession> {
    await delay(280);
    return updatePracticeSessionInStore(id, patch, this.listActiveTeamOptions());
  },
  async duplicatePracticeSession(id: string): Promise<PracticeSession> {
    await delay(240);
    return duplicatePracticeSessionInStore(id, this.listActiveTeamOptions());
  },
  async cancelPracticeSession(id: string): Promise<PracticeSession> {
    await delay(220);
    return cancelPracticeSessionInStore(id);
  },
  async archivePracticeSession(id: string): Promise<PracticeSession> {
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
    await delay();
    return listAttendanceFromStore(filters);
  },
  getAttendanceSnapshot(): SportsAttendanceRecord[] {
    return listAttendanceFromStore();
  },
  async getAttendanceById(id: string): Promise<SportsAttendanceRecord | null> {
    await delay(120);
    return getAttendanceByIdFromStore(id);
  },
  async createAttendance(input: SportsAttendanceInput): Promise<SportsAttendanceRecord> {
    await delay(280);
    return createAttendanceInStore(input);
  },
  async updateAttendance(
    id: string,
    patch: Partial<SportsAttendanceInput>,
  ): Promise<SportsAttendanceRecord> {
    await delay(280);
    return updateAttendanceInStore(id, patch);
  },
  getAttendanceSummary(filters?: SportsAttendanceListFilters): SportsAttendanceSummary {
    return computeAttendanceSummary(listAttendanceFromStore(filters));
  },
  async completeSessionAttendance(
    sessionId: string,
  ): Promise<{ sessionId: string; recordCount: number }> {
    await delay(220);
    return completeSessionAttendanceInStore(sessionId);
  },
  isSessionAttendanceCompleted(sessionId: string): boolean {
    return isSessionAttendanceCompleted(sessionId);
  },
  listEligiblePracticeSessionOptions(): ReturnType<typeof listEligiblePracticeSessionOptions> {
    return listEligiblePracticeSessionOptions();
  },

  async listCoachNotes(filters?: CoachNoteListFilters): Promise<CoachNoteRecord[]> {
    await delay();
    return listCoachNotesFromStore(filters);
  },
  getCoachNotesSnapshot(): CoachNoteRecord[] {
    return listCoachNotesFromStore();
  },
  async getCoachNoteById(id: string): Promise<CoachNoteRecord | null> {
    await delay(120);
    return getCoachNoteByIdFromStore(id);
  },
  async createCoachNote(input: CoachNoteInput): Promise<CoachNoteRecord> {
    await delay(280);
    return createCoachNoteInStore(input);
  },
  async updateCoachNote(id: string, patch: Partial<CoachNoteInput>): Promise<CoachNoteRecord> {
    await delay(280);
    return updateCoachNoteInStore(id, patch);
  },
  getCoachNoteSummary(filters?: CoachNoteListFilters): CoachNoteSummary {
    return computeCoachNoteSummary(listCoachNotesFromStore(filters));
  },
  async sendFollowUpNotification(id: string): Promise<CoachNoteRecord> {
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
    await delay();
    return listTournamentsFromStore(filters);
  },
  getTournamentsSnapshot(): SportsTournament[] {
    return listTournamentsFromStore();
  },
  async getTournamentById(id: string): Promise<SportsTournament | null> {
    await delay(120);
    return getTournamentByIdFromStore(id);
  },
  async createTournament(input: SportsTournamentInput): Promise<SportsTournament> {
    await delay(280);
    return createTournamentInStore(input);
  },
  async updateTournament(
    id: string,
    patch: Partial<SportsTournamentInput> & { status?: SportsTournament["status"] },
  ): Promise<SportsTournament> {
    await delay(280);
    return updateTournamentInStore(id, patch);
  },
  async duplicateTournament(id: string): Promise<SportsTournament> {
    await delay(240);
    return duplicateTournamentInStore(id);
  },
  async publishTournament(id: string): Promise<SportsTournament> {
    await delay(220);
    return publishTournamentInStore(id);
  },
  async cancelTournament(id: string): Promise<SportsTournament> {
    await delay(220);
    return cancelTournamentInStore(id);
  },
  async archiveTournament(id: string): Promise<SportsTournament> {
    await delay(220);
    return archiveTournamentInStore(id);
  },
  async addTournamentMatch(
    tournamentId: string,
    input: TournamentMatchInput,
  ): Promise<SportsTournament> {
    await delay(200);
    return addMatchToTournamentInStore(tournamentId, input);
  },
  async updateTournamentMatch(
    tournamentId: string,
    matchId: string,
    patch: Partial<TournamentMatchInput> & { status?: TournamentMatch["status"] },
  ): Promise<SportsTournament> {
    await delay(200);
    return updateMatchInTournamentInStore(tournamentId, matchId, patch);
  },
  async removeTournamentMatch(tournamentId: string, matchId: string): Promise<SportsTournament> {
    await delay(180);
    return removeMatchFromTournamentInStore(tournamentId, matchId);
  },
  async getTournamentsCalendarMarks(): Promise<CalendarActivityMark[]> {
    await delay(80);
    return getTournamentsCalendarMarks();
  },

  async listMatchResults(filters?: MatchResultListFilters): Promise<MatchResult[]> {
    await delay();
    return listMatchResultsFromStore(filters);
  },
  getMatchResultsSnapshot(): MatchResult[] {
    return listMatchResultsFromStore();
  },
  async getMatchResultById(id: string): Promise<MatchResult | null> {
    await delay(120);
    return getMatchResultByIdFromStore(id);
  },
  async createMatchResult(input: MatchResultInput): Promise<MatchResult> {
    await delay(280);
    return createMatchResultInStore(input);
  },
  async updateMatchResult(id: string, patch: Partial<MatchResultInput>): Promise<MatchResult> {
    await delay(280);
    return updateMatchResultInStore(id, patch);
  },
  async publishMatchResult(id: string): Promise<MatchResult> {
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
    teamsStore = sportTeamsSeed.map(cloneSportsTeam);
    resetActivitiesStore();
    resetPracticeSessionsStore();
    resetSportsAttendanceStore();
    resetCoachNotesStore();
    resetTournamentsStore();
    resetMatchResultsStore();
  },
};

export type { SportType };
