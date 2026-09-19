import * as api from "./api";
import type {
  CalendarEventDto,
  CoachNoteDto,
  EquipmentDto,
  MatchResultDto,
  MedicalFitnessDto,
  PracticeSessionDto,
  SportsAttendanceDto,
  TeamSelectionDto,
  TournamentDto,
  VenueDto,
} from "./api-types";
import { getActivityApiInstituteId } from "./context";
import {
  mapCoachNoteDto,
  mapEquipmentDto,
  mapMatchResultDto,
  mapPracticeSessionDto,
  mapSportsAttendanceDto,
  mapTournamentDto,
  mapVenueDto,
} from "./sports-v2-map";

export type SportsV2ApiSnapshot = {
  instituteId: string;
  practiceSessions: PracticeSessionDto[];
  venues: VenueDto[];
  equipment: EquipmentDto[];
  tournaments: TournamentDto[];
  matchResults: MatchResultDto[];
  coachNotes: CoachNoteDto[];
  attendance: SportsAttendanceDto[];
  teamSelections: TeamSelectionDto[];
  medicalFitness: MedicalFitnessDto[];
  calendarEvents: CalendarEventDto[];
};

const snapshots = new Map<string, SportsV2ApiSnapshot>();
const listeners = new Set<() => void>();

function requireInstitute(): string {
  const instituteId = getActivityApiInstituteId();
  if (!instituteId) throw new Error("Activity API context is not configured");
  return instituteId;
}

function emptySnapshot(instituteId: string): SportsV2ApiSnapshot {
  return {
    instituteId,
    practiceSessions: [],
    venues: [],
    equipment: [],
    tournaments: [],
    matchResults: [],
    coachNotes: [],
    attendance: [],
    teamSelections: [],
    medicalFitness: [],
    calendarEvents: [],
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSportsV2ApiStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSportsV2ApiSnapshot(): SportsV2ApiSnapshot {
  const instituteId = requireInstitute();
  return snapshots.get(instituteId) ?? emptySnapshot(instituteId);
}

export async function loadSportsV2ApiStore(): Promise<SportsV2ApiSnapshot> {
  const instituteId = requireInstitute();
  const [
    practiceSessions,
    venues,
    equipment,
    tournaments,
    matchResults,
    coachNotes,
    attendance,
    teamSelections,
    medicalFitness,
    calendarEvents,
  ] = await Promise.all([
    api.listPracticeSessions(instituteId),
    api.listVenues(instituteId),
    api.listEquipment(instituteId),
    api.listTournaments(instituteId),
    api.listMatchResults(instituteId),
    api.listCoachNotes(instituteId),
    api.listSportsAttendance(instituteId),
    api.listTeamSelections(instituteId),
    api.listMedicalFitness(instituteId),
    api.listCalendarEvents(instituteId),
  ]);
  const snapshot = {
    instituteId,
    practiceSessions,
    venues,
    equipment,
    tournaments,
    matchResults,
    coachNotes,
    attendance,
    teamSelections,
    medicalFitness,
    calendarEvents,
  };
  snapshots.set(instituteId, snapshot);
  emit();
  return snapshot;
}

export function resetSportsV2ApiStore(instituteId?: string) {
  if (instituteId) snapshots.delete(instituteId);
  else snapshots.clear();
  emit();
}

async function refreshAfter<T>(operation: Promise<T>): Promise<T> {
  const result = await operation;
  await loadSportsV2ApiStore();
  return result;
}

async function deleteAndRefresh(operation: Promise<void>): Promise<void> {
  await operation;
  await loadSportsV2ApiStore();
}

export const sportsV2ApiStore = {
  preload: loadSportsV2ApiStore,
  subscribe: subscribeSportsV2ApiStore,
  reset: resetSportsV2ApiStore,
  getSnapshot: getSportsV2ApiSnapshot,

  listPracticeSessions: async () =>
    (await loadSportsV2ApiStore()).practiceSessions.map(mapPracticeSessionDto),
  createPracticeSession: (input: Parameters<typeof api.createPracticeSession>[0]) =>
    refreshAfter(api.createPracticeSession(input)),
  updatePracticeSession: (id: string, input: Parameters<typeof api.updatePracticeSession>[1]) =>
    refreshAfter(api.updatePracticeSession(id, input)),
  deletePracticeSession: (id: string) => deleteAndRefresh(api.deletePracticeSession(id)),

  listVenues: async () => (await loadSportsV2ApiStore()).venues.map(mapVenueDto),
  createVenue: (input: Parameters<typeof api.createVenue>[0]) =>
    refreshAfter(api.createVenue(input)),
  updateVenue: (id: string, input: Parameters<typeof api.updateVenue>[1]) =>
    refreshAfter(api.updateVenue(id, input)),
  deleteVenue: (id: string) => deleteAndRefresh(api.deleteVenue(id)),

  listEquipment: async () => (await loadSportsV2ApiStore()).equipment.map(mapEquipmentDto),
  createEquipment: (input: Parameters<typeof api.createEquipment>[0]) =>
    refreshAfter(api.createEquipment(input)),
  updateEquipment: (id: string, input: Parameters<typeof api.updateEquipment>[1]) =>
    refreshAfter(api.updateEquipment(id, input)),
  deleteEquipment: (id: string) => deleteAndRefresh(api.deleteEquipment(id)),

  listTournaments: async () => (await loadSportsV2ApiStore()).tournaments.map(mapTournamentDto),
  createTournament: (input: Parameters<typeof api.createTournament>[0]) =>
    refreshAfter(api.createTournament(input)),
  updateTournament: (id: string, input: Parameters<typeof api.updateTournament>[1]) =>
    refreshAfter(api.updateTournament(id, input)),
  deleteTournament: (id: string) => deleteAndRefresh(api.deleteTournament(id)),

  listMatchResults: async () => (await loadSportsV2ApiStore()).matchResults.map(mapMatchResultDto),
  createMatchResult: (input: Parameters<typeof api.createMatchResult>[0]) =>
    refreshAfter(api.createMatchResult(input)),
  updateMatchResult: (id: string, input: Parameters<typeof api.updateMatchResult>[1]) =>
    refreshAfter(api.updateMatchResult(id, input)),
  deleteMatchResult: (id: string) => deleteAndRefresh(api.deleteMatchResult(id)),

  listCoachNotes: async () => (await loadSportsV2ApiStore()).coachNotes.map(mapCoachNoteDto),
  createCoachNote: (input: Parameters<typeof api.createCoachNote>[0]) =>
    refreshAfter(api.createCoachNote(input)),
  updateCoachNote: (id: string, input: Parameters<typeof api.updateCoachNote>[1]) =>
    refreshAfter(api.updateCoachNote(id, input)),
  deleteCoachNote: (id: string) => deleteAndRefresh(api.deleteCoachNote(id)),

  listAttendance: async () => (await loadSportsV2ApiStore()).attendance.map(mapSportsAttendanceDto),
  createAttendance: (input: Parameters<typeof api.createSportsAttendance>[0]) =>
    refreshAfter(api.createSportsAttendance(input)),
  updateAttendance: (id: string, input: Parameters<typeof api.updateSportsAttendance>[1]) =>
    refreshAfter(api.updateSportsAttendance(id, input)),
  deleteAttendance: (id: string) => deleteAndRefresh(api.deleteSportsAttendance(id)),

  createTeamSelection: (input: Parameters<typeof api.createTeamSelection>[0]) =>
    refreshAfter(api.createTeamSelection(input)),
  updateTeamSelection: (id: string, input: Parameters<typeof api.updateTeamSelection>[1]) =>
    refreshAfter(api.updateTeamSelection(id, input)),
  deleteTeamSelection: (id: string) => deleteAndRefresh(api.deleteTeamSelection(id)),

  createMedicalFitness: (input: Parameters<typeof api.createMedicalFitness>[0]) =>
    refreshAfter(api.createMedicalFitness(input)),
  updateMedicalFitness: (id: string, input: Parameters<typeof api.updateMedicalFitness>[1]) =>
    refreshAfter(api.updateMedicalFitness(id, input)),
  deleteMedicalFitness: (id: string) => deleteAndRefresh(api.deleteMedicalFitness(id)),

  createCalendarEvent: (input: Parameters<typeof api.createCalendarEvent>[0]) =>
    refreshAfter(api.createCalendarEvent(input)),
  updateCalendarEvent: (id: string, input: Parameters<typeof api.updateCalendarEvent>[1]) =>
    refreshAfter(api.updateCalendarEvent(id, input)),
  deleteCalendarEvent: (id: string) => deleteAndRefresh(api.deleteCalendarEvent(id)),
};
