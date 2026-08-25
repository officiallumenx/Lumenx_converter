import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { SPORT_TYPE_LABELS } from "./types";
import {
  cloneTournament,
  createMatchFromInput,
  createTournamentFromInput,
  tournamentsSeed,
  tournamentsToCalendarMarks,
} from "./tournaments-mock";
import type {
  SportsTournament,
  SportsTournamentInput,
  TournamentListFilters,
  TournamentMatch,
  TournamentMatchInput,
} from "./tournaments-types";

let tournamentsStore: SportsTournament[] = tournamentsSeed.map(cloneTournament);

function applyTournamentFilters(
  items: SportsTournament[],
  filters?: TournamentListFilters,
): SportsTournament[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.status && f.status !== "all") {
    result = result.filter((t) => t.status === f.status);
  }
  if (f.sportType && f.sportType !== "all") {
    result = result.filter((t) => t.sportType === f.sportType);
  }
  if (f.tournamentType && f.tournamentType !== "all") {
    result = result.filter((t) => t.tournamentType === f.tournamentType);
  }
  if (f.academicYear && f.academicYear !== "all") {
    result = result.filter((t) => t.academicYear === f.academicYear);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.organizer.toLowerCase().includes(q) ||
        t.venue.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        SPORT_TYPE_LABELS[t.sportType].toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "updatedAt") {
      return dir * a.updatedAt.localeCompare(b.updatedAt);
    }
    return dir * a.startDate.localeCompare(b.startDate);
  });

  return result;
}

export function resetTournamentsStore() {
  tournamentsStore = tournamentsSeed.map(cloneTournament);
}

export function listTournamentsFromStore(filters?: TournamentListFilters): SportsTournament[] {
  return applyTournamentFilters(tournamentsStore, filters).map(cloneTournament);
}

export function getTournamentByIdFromStore(id: string): SportsTournament | null {
  const found = tournamentsStore.find((t) => t.id === id);
  return found ? cloneTournament(found) : null;
}

export function createTournamentInStore(input: SportsTournamentInput): SportsTournament {
  const tournament = createTournamentFromInput(input);
  tournamentsStore = [tournament, ...tournamentsStore];
  return cloneTournament(tournament);
}

export function updateTournamentInStore(
  id: string,
  patch: Partial<SportsTournamentInput> & { status?: SportsTournament["status"] },
): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tournament not found");
  const prev = tournamentsStore[idx];
  const { matches: _ignoredMatches, ...restPatch } = patch;
  const updated = cloneTournament({
    ...prev,
    ...restPatch,
    matches: prev.matches,
    name: patch.name?.trim() ?? prev.name,
    venue: patch.venue?.trim() ?? prev.venue,
    organizer: patch.organizer?.trim() ?? prev.organizer,
    description: patch.description?.trim() ?? prev.description,
    audience: patch.audience ?? prev.audience,
    linkedTeamIds: patch.linkedTeamIds ?? prev.linkedTeamIds,
    notifications: patch.notifications ?? prev.notifications,
    status: patch.status ?? prev.status,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === id ? updated : t));
  return cloneTournament(updated);
}

export function duplicateTournamentInStore(id: string): SportsTournament {
  const source = getTournamentByIdFromStore(id);
  if (!source) throw new Error("Tournament not found");
  const copy = createTournamentFromInput(
    {
      name: `${source.name} (Copy)`,
      tournamentType: source.tournamentType,
      sportType: source.sportType,
      academicYear: source.academicYear,
      venue: source.venue,
      startDate: source.startDate,
      endDate: source.endDate,
      organizer: source.organizer,
      description: source.description,
      audience: source.audience,
      linkedTeamIds: source.linkedTeamIds,
      matches: source.matches.map((m) => ({
        name: m.name,
        stage: m.stage,
        date: m.date,
        time: m.time,
        venue: m.venue,
        teamIds: m.teamIds,
        teamNames: m.teamNames,
      })),
      notifications: { ...source.notifications, notifyAudience: false },
    },
    `tourn-${Date.now()}`,
  );
  tournamentsStore = [copy, ...tournamentsStore];
  return cloneTournament(copy);
}

export function publishTournamentInStore(id: string): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tournament not found");
  const published = cloneTournament({
    ...tournamentsStore[idx],
    status: "scheduled",
    publishedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === id ? published : t));
  return cloneTournament(published);
}

export function cancelTournamentInStore(id: string): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tournament not found");
  const cancelled = cloneTournament({
    ...tournamentsStore[idx],
    status: "cancelled",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === id ? cancelled : t));
  return cloneTournament(cancelled);
}

export function archiveTournamentInStore(id: string): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tournament not found");
  const archived = cloneTournament({
    ...tournamentsStore[idx],
    status: "archived",
    archivedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === id ? archived : t));
  return cloneTournament(archived);
}

export function addMatchToTournamentInStore(
  tournamentId: string,
  input: TournamentMatchInput,
): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === tournamentId);
  if (idx < 0) throw new Error("Tournament not found");
  const match = createMatchFromInput(tournamentId, input);
  const updated = cloneTournament({
    ...tournamentsStore[idx],
    matches: [...tournamentsStore[idx].matches, match],
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === tournamentId ? updated : t));
  return cloneTournament(updated);
}

export function updateMatchInTournamentInStore(
  tournamentId: string,
  matchId: string,
  patch: Partial<TournamentMatchInput> & { status?: TournamentMatch["status"] },
): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === tournamentId);
  if (idx < 0) throw new Error("Tournament not found");
  const prev = tournamentsStore[idx];
  const matches = prev.matches.map((m) => {
    if (m.id !== matchId) return m;
    return {
      ...m,
      ...patch,
      name: patch.name?.trim() ?? m.name,
      venue: patch.venue?.trim() ?? m.venue,
      teamIds: patch.teamIds ?? m.teamIds,
      teamNames: patch.teamNames ?? m.teamNames,
      status: patch.status ?? m.status,
    };
  });
  const updated = cloneTournament({
    ...prev,
    matches,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === tournamentId ? updated : t));
  return cloneTournament(updated);
}

export function removeMatchFromTournamentInStore(
  tournamentId: string,
  matchId: string,
): SportsTournament {
  const idx = tournamentsStore.findIndex((t) => t.id === tournamentId);
  if (idx < 0) throw new Error("Tournament not found");
  const updated = cloneTournament({
    ...tournamentsStore[idx],
    matches: tournamentsStore[idx].matches.filter((m) => m.id !== matchId),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  tournamentsStore = tournamentsStore.map((t) => (t.id === tournamentId ? updated : t));
  return cloneTournament(updated);
}

export function getTournamentsCalendarMarks(): CalendarActivityMark[] {
  return tournamentsToCalendarMarks(tournamentsStore);
}
