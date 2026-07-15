import { getMatchResultByIdFromStore, listMatchResultsFromStore } from "../sports/match-results-store";
import { sportTeamsSeed } from "../sports/mock-data";
import {
  achievementsSeed,
  cloneAchievement,
  createAchievementFromInput,
} from "./mock";
import type {
  AchievementListFilters,
  AchievementSourceModule,
  AchievementSourceRecordKind,
  AchievementSourceRef,
  ActivityAchievement,
  ActivityAchievementInput,
} from "./types";
import { ACHIEVEMENT_SOURCE_MODULE_LABELS } from "./types";

let achievementsStore: ActivityAchievement[] = achievementsSeed.map(cloneAchievement);

function resolveSourceRef(
  module: AchievementSourceModule,
  recordId: string,
  recordKind: AchievementSourceRecordKind,
): AchievementSourceRef {
  if (module === "sports" && recordKind === "match_result") {
    const result = getMatchResultByIdFromStore(recordId);
    if (!result) {
      throw new Error("Source match result not found — achievements require a valid sports record.");
    }
    return {
      module: "sports",
      recordId: result.id,
      recordLabel: `${result.matchName} (${result.tournamentName})`,
      recordKind: "match_result",
    };
  }

  if (module !== "sports") {
    throw new Error(
      `${ACHIEVEMENT_SOURCE_MODULE_LABELS[module]} source records are not yet available in this demo.`,
    );
  }

  throw new Error("Unsupported sports source record kind.");
}

function applyAchievementFilters(
  items: ActivityAchievement[],
  filters?: AchievementListFilters,
): ActivityAchievement[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.achievementType && f.achievementType !== "all") {
    result = result.filter((a) => a.achievementType === f.achievementType);
  }
  if (f.level && f.level !== "all") {
    result = result.filter((a) => a.level === f.level);
  }
  if (f.studentId && f.studentId !== "all") {
    result = result.filter((a) => a.studentId === f.studentId);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((a) => a.teamId === f.teamId);
  }
  if (f.sourceModule && f.sourceModule !== "all") {
    result = result.filter((a) => a.source.module === f.sourceModule);
  }
  if (f.date && f.date !== "all") {
    result = result.filter((a) => a.date === f.date);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.studentName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.source.recordLabel.toLowerCase().includes(q) ||
        (a.teamName?.toLowerCase().includes(q) ?? false),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "student") return dir * a.studentName.localeCompare(b.studentName);
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.date.localeCompare(b.date);
  });

  return result;
}

export function resetAchievementsStore() {
  achievementsStore = achievementsSeed.map(cloneAchievement);
}

export function listAchievementsFromStore(filters?: AchievementListFilters): ActivityAchievement[] {
  return applyAchievementFilters(achievementsStore, filters).map(cloneAchievement);
}

export function getAchievementByIdFromStore(id: string): ActivityAchievement | null {
  const found = achievementsStore.find((a) => a.id === id);
  return found ? cloneAchievement(found) : null;
}

export function createAchievementInStore(input: ActivityAchievementInput): ActivityAchievement {
  const source = resolveSourceRef(input.sourceModule, input.sourceRecordId, input.sourceRecordKind);
  const record = createAchievementFromInput(input, source);
  achievementsStore = [record, ...achievementsStore];
  return cloneAchievement(record);
}

export function updateAchievementInStore(
  id: string,
  patch: Partial<ActivityAchievementInput>,
): ActivityAchievement {
  const idx = achievementsStore.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Achievement not found");

  const prev = achievementsStore[idx];
  const module = patch.sourceModule ?? prev.source.module;
  const recordId = patch.sourceRecordId ?? prev.source.recordId;
  const recordKind = patch.sourceRecordKind ?? prev.source.recordKind;
  const source = resolveSourceRef(module, recordId, recordKind);

  const updated = cloneAchievement({
    ...prev,
    title: patch.title?.trim() ?? prev.title,
    achievementType: patch.achievementType ?? prev.achievementType,
    level: patch.level ?? prev.level,
    source,
    studentId: patch.studentId ?? prev.studentId,
    studentName: patch.studentName ?? prev.studentName,
    studentClassLabel: patch.studentClassLabel ?? prev.studentClassLabel,
    teamId: patch.teamId ?? prev.teamId,
    teamName: patch.teamName ?? prev.teamName,
    date: patch.date ?? prev.date,
    description: patch.description?.trim() ?? prev.description,
    notifications: patch.notifications ?? prev.notifications,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  achievementsStore = achievementsStore.map((a) => (a.id === id ? updated : a));
  return cloneAchievement(updated);
}

export function awardAchievementInStore(id: string): ActivityAchievement {
  const idx = achievementsStore.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Achievement not found");
  const awarded = cloneAchievement({
    ...achievementsStore[idx],
    awardedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  achievementsStore = achievementsStore.map((a) => (a.id === id ? awarded : a));
  return cloneAchievement(awarded);
}

export function listEligibleSourceOptions(module: AchievementSourceModule): {
  recordId: string;
  recordKind: AchievementSourceRecordKind;
  label: string;
  date: string;
  module: AchievementSourceModule;
}[] {
  if (module === "sports") {
    return listMatchResultsFromStore().map((r) => ({
      recordId: r.id,
      recordKind: "match_result" as const,
      label: `${r.matchName} — ${r.tournamentName} (${r.finalScore})`,
      date: r.matchDate,
      module: "sports" as const,
    }));
  }
  return [];
}

export function listStudentFilterOptions(): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const a of achievementsStore) {
    seen.set(a.studentId, `${a.studentName} (${a.studentClassLabel})`);
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

export function listTeamFilterOptions(): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const a of achievementsStore) {
    if (a.teamId && a.teamName) seen.set(a.teamId, a.teamName);
  }
  for (const t of sportTeamsSeed) {
    if (!seen.has(t.id)) seen.set(t.id, t.name);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}
