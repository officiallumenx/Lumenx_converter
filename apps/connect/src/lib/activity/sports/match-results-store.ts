import { listTournamentsFromStore } from "./tournaments-store";
import {
  cloneMatchResult,
  createMatchResultFromInput,
  matchResultsSeed,
} from "./match-results-mock";
import type {
  MatchResult,
  MatchResultInput,
  MatchResultListFilters,
} from "./match-results-types";
import { SPORT_TYPE_LABELS } from "./types";
import type { TournamentMatch } from "./tournaments-types";

let resultsStore: MatchResult[] = matchResultsSeed.map(cloneMatchResult);

function resolveTournamentMatch(matchId: string): {
  tournamentId: string;
  tournamentName: string;
  match: TournamentMatch;
  sportType: import("./types").SportType;
} {
  for (const tournament of listTournamentsFromStore()) {
    const match = tournament.matches.find((m) => m.id === matchId);
    if (match) {
      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        match,
        sportType: tournament.sportType,
      };
    }
  }
  throw new Error(
    "Parent tournament match not found — match results require an existing tournament match.",
  );
}

function assertUniqueMatchResult(matchId: string, excludeId?: string) {
  const clash = resultsStore.find(
    (r) => r.tournamentMatchId === matchId && r.id !== excludeId,
  );
  if (clash) throw new Error("A result already exists for this tournament match.");
}

function applyResultFilters(
  items: MatchResult[],
  filters?: MatchResultListFilters,
): MatchResult[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.tournamentId && f.tournamentId !== "all") {
    result = result.filter((r) => r.tournamentId === f.tournamentId);
  }
  if (f.sportType && f.sportType !== "all") {
    result = result.filter((r) => r.sportType === f.sportType);
  }
  if (f.matchStatus && f.matchStatus !== "all") {
    result = result.filter((r) => r.matchStatus === f.matchStatus);
  }
  if (f.winner && f.winner !== "all") {
    result = result.filter((r) => r.winnerName === f.winner || r.winnerId === f.winner);
  }
  if (f.date && f.date !== "all") {
    result = result.filter((r) => r.matchDate === f.date);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.matchName.toLowerCase().includes(q) ||
        r.tournamentName.toLowerCase().includes(q) ||
        r.finalScore.toLowerCase().includes(q) ||
        r.matchSummary.toLowerCase().includes(q) ||
        (r.winnerName?.toLowerCase().includes(q) ?? false) ||
        (r.awards.mvp?.toLowerCase().includes(q) ?? false),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.matchDate.localeCompare(b.matchDate);
  });

  return result;
}

export function resetMatchResultsStore() {
  resultsStore = matchResultsSeed.map(cloneMatchResult);
}

export function listMatchResultsFromStore(filters?: MatchResultListFilters): MatchResult[] {
  return applyResultFilters(resultsStore, filters).map(cloneMatchResult);
}

export function getMatchResultByIdFromStore(id: string): MatchResult | null {
  const found = resultsStore.find((r) => r.id === id);
  return found ? cloneMatchResult(found) : null;
}

export function createMatchResultInStore(input: MatchResultInput): MatchResult {
  const { tournamentId, tournamentName, match, sportType } = resolveTournamentMatch(
    input.tournamentMatchId,
  );
  assertUniqueMatchResult(input.tournamentMatchId);
  const record = createMatchResultFromInput(input, {
    tournamentId,
    tournamentName,
    matchName: match.name,
    sportType,
    matchDate: match.date,
    venue: match.venue,
  });
  resultsStore = [record, ...resultsStore];
  return cloneMatchResult(record);
}

export function updateMatchResultInStore(
  id: string,
  patch: Partial<MatchResultInput>,
): MatchResult {
  const idx = resultsStore.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Match result not found");

  const prev = resultsStore[idx];
  const matchId = patch.tournamentMatchId ?? prev.tournamentMatchId;
  assertUniqueMatchResult(matchId, id);
  const { tournamentId, tournamentName, match, sportType } = resolveTournamentMatch(matchId);

  const updated = cloneMatchResult({
    ...prev,
    ...patch,
    tournamentMatchId: matchId,
    tournamentId,
    tournamentName,
    matchName: match.name,
    sportType,
    matchDate: match.date,
    venue: match.venue,
    finalScore: patch.finalScore?.trim() ?? prev.finalScore,
    matchSummary: patch.matchSummary?.trim() ?? prev.matchSummary,
    awards: patch.awards ? { ...patch.awards } : prev.awards,
    statistics: patch.statistics ? { ...patch.statistics } : prev.statistics,
    highlights: patch.highlights ? { ...patch.highlights } : prev.highlights,
    attachments: patch.attachments ?? prev.attachments,
    notifications: patch.notifications ?? prev.notifications,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  resultsStore = resultsStore.map((r) => (r.id === id ? updated : r));
  return cloneMatchResult(updated);
}

export function publishMatchResultInStore(id: string): MatchResult {
  const idx = resultsStore.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Match result not found");
  const published = cloneMatchResult({
    ...resultsStore[idx],
    resultPublishedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  resultsStore = resultsStore.map((r) => (r.id === id ? published : r));
  return cloneMatchResult(published);
}

export function listEligibleTournamentMatchOptions(): {
  matchId: string;
  label: string;
  tournamentId: string;
  tournamentName: string;
  matchDate: string;
  teamNames: string[];
  teamIds: string[];
  hasResult: boolean;
}[] {
  const noted = new Set(resultsStore.map((r) => r.tournamentMatchId));
  const options: ReturnType<typeof listEligibleTournamentMatchOptions> = [];

  for (const t of listTournamentsFromStore()) {
    if (t.status === "archived" || t.status === "cancelled") continue;
    for (const m of t.matches) {
      if (m.status === "cancelled") continue;
      options.push({
        matchId: m.id,
        label: `${m.name} — ${t.name} (${m.date})`,
        tournamentId: t.id,
        tournamentName: t.name,
        matchDate: m.date,
        teamNames: m.teamNames,
        teamIds: m.teamIds,
        hasResult: noted.has(m.id),
      });
    }
  }

  return options.sort((a, b) => b.matchDate.localeCompare(a.matchDate));
}

export function listTournamentFilterOptions(): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const r of resultsStore) seen.set(r.tournamentId, r.tournamentName);
  for (const t of listTournamentsFromStore()) {
    if (!seen.has(t.id)) seen.set(t.id, t.name);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

export function listWinnerFilterOptions(): string[] {
  const names = new Set<string>();
  resultsStore.forEach((r) => {
    if (r.winnerName) names.add(r.winnerName);
  });
  return [...names].sort();
}

export { SPORT_TYPE_LABELS };
