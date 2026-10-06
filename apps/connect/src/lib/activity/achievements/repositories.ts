import { isApiAuthMode } from "@/auth/auth-mode";
import {
  createAchievement as createAchievementApi,
  listAchievements as listAchievementsApi,
} from "@/lib/activity/api";
import type { AchievementDto } from "@/lib/activity/api-types";
import { getActivityApiSnapshot, loadActivityApiHierarchy } from "@/lib/activity/api-store";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import {
  awardAchievementInStore,
  createAchievementInStore,
  getAchievementByIdFromStore,
  listAchievementsFromStore,
  listEligibleSourceOptions,
  listStudentFilterOptions,
  listTeamFilterOptions,
  resetAchievementsStore,
  updateAchievementInStore,
} from "./store";
import type {
  AchievementListFilters,
  AchievementSourceModule,
  AchievementType,
  ActivityAchievement,
  ActivityAchievementInput,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

let apiCache: ActivityAchievement[] = [];

function requireInstituteId(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

function kindToAchievementType(kind: AchievementDto["kind"]): AchievementType {
  if (kind === "participation") return "participation";
  if (kind === "award") return "coach_recognition";
  return "custom";
}

function mapAchievementDto(row: AchievementDto): ActivityAchievement {
  const snapshot = getActivityApiSnapshot();
  const team = row.teamId ? snapshot.teams.find((t) => t.id === row.teamId) : null;
  const section = team
    ? snapshot.sections.find((s) => s.id === team.sectionId)
    : row.sectionId
      ? snapshot.sections.find((s) => s.id === row.sectionId)
      : null;
  const domain = section?.domain === "eca" ? "clubs" : "sports";
  const teamName = team?.name;
  const date = row.awardedOn.slice(0, 10);
  return {
    id: row.id,
    title: row.title,
    achievementType: kindToAchievementType(row.kind),
    level: "school",
    source: {
      module: domain,
      recordId: row.teamId ?? row.id,
      recordLabel: teamName ?? row.title,
      recordKind: "custom",
    },
    studentId: row.studentId,
    studentName: "Student",
    studentClassLabel: "—",
    teamId: row.teamId ?? undefined,
    teamName,
    date,
    description: row.notes ?? "",
    notifications: {
      notifyStudent: true,
      notifyParents: true,
      notifyTeachers: false,
    },
    awardedAt: date,
    createdAt: row.createdAt.slice(0, 10),
    updatedAt: row.updatedAt.slice(0, 10),
  };
}

function applyFilters(
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

async function loadApiAchievements(): Promise<ActivityAchievement[]> {
  const instituteId = requireInstituteId();
  await loadActivityApiHierarchy();
  const rows = await listAchievementsApi(instituteId);
  apiCache = rows.map(mapAchievementDto);
  return apiCache;
}

function achievementTypeToKind(
  type: ActivityAchievementInput["achievementType"],
): AchievementDto["kind"] {
  if (type === "participation") return "participation";
  if (type === "winner" || type === "runner_up" || type === "mvp" || type === "best_performer") {
    return "award";
  }
  return "award";
}

export const achievementsRepository = {
  async listAchievements(filters?: AchievementListFilters): Promise<ActivityAchievement[]> {
    if (isApiAuthMode()) {
      const rows = await loadApiAchievements();
      return applyFilters(rows, filters);
    }
    await delay();
    return listAchievementsFromStore(filters);
  },
  getAchievementsSnapshot(): ActivityAchievement[] {
    if (isApiAuthMode()) return apiCache.map((a) => ({ ...a }));
    return listAchievementsFromStore();
  },
  async getAchievementById(id: string): Promise<ActivityAchievement | null> {
    if (isApiAuthMode()) {
      const rows = await loadApiAchievements();
      return rows.find((a) => a.id === id) ?? null;
    }
    await delay(120);
    return getAchievementByIdFromStore(id);
  },
  async createAchievement(input: ActivityAchievementInput): Promise<ActivityAchievement> {
    if (isApiAuthMode()) {
      const instituteId = requireInstituteId();
      await loadActivityApiHierarchy();
      const teamId =
        input.teamId ??
        (input.sourceRecordKind === "activity" ? input.sourceRecordId : undefined) ??
        null;
      const row = await createAchievementApi({
        instituteId,
        studentId: input.studentId,
        teamId,
        title: input.title,
        awardedOn: input.date,
        kind: achievementTypeToKind(input.achievementType),
        notes: input.description || null,
      });
      const mapped = mapAchievementDto(row);
      mapped.studentName = input.studentName;
      mapped.studentClassLabel = input.studentClassLabel;
      mapped.teamName = input.teamName ?? mapped.teamName;
      apiCache = [mapped, ...apiCache.filter((a) => a.id !== mapped.id)];
      return { ...mapped };
    }
    await delay(280);
    return createAchievementInStore(input);
  },
  async updateAchievement(
    id: string,
    patch: Partial<ActivityAchievementInput>,
  ): Promise<ActivityAchievement> {
    if (isApiAuthMode()) {
      throw new Error("Achievement updates are not supported by the activity API");
    }
    await delay(280);
    return updateAchievementInStore(id, patch);
  },
  async awardAchievement(id: string): Promise<ActivityAchievement> {
    if (isApiAuthMode()) {
      const rows = await loadApiAchievements();
      const found = rows.find((a) => a.id === id);
      if (!found) throw new Error("Achievement not found");
      const awarded = {
        ...found,
        awardedAt: found.awardedAt ?? found.date,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      apiCache = apiCache.map((a) => (a.id === id ? awarded : a));
      return { ...awarded };
    }
    await delay(220);
    return awardAchievementInStore(id);
  },
  listEligibleSourceOptions(module: AchievementSourceModule) {
    if (isApiAuthMode()) {
      const snapshot = getActivityApiSnapshot();
      if (module === "sports" || module === "clubs" || module === "events") {
        const domain = module === "sports" ? "sports" : "eca";
        return snapshot.teams
          .filter((t) => {
            const section = snapshot.sections.find((s) => s.id === t.sectionId);
            if (!section) return false;
            if (module === "sports") return section.domain === "sports";
            return section.domain === "eca";
          })
          .map((t) => ({
            recordId: t.id,
            recordKind: "activity" as const,
            label: t.name,
            date: t.updatedAt.slice(0, 10),
            module,
          }));
      }
      return [];
    }
    return listEligibleSourceOptions(module);
  },
  listStudentFilterOptions() {
    if (isApiAuthMode()) {
      const seen = new Map<string, string>();
      for (const a of apiCache) {
        seen.set(a.studentId, `${a.studentName} (${a.studentClassLabel})`);
      }
      return [...seen.entries()].map(([id, label]) => ({ id, label }));
    }
    return listStudentFilterOptions();
  },
  listTeamFilterOptions() {
    if (isApiAuthMode()) {
      const snapshot = getActivityApiSnapshot();
      const seen = new Map<string, string>();
      for (const t of snapshot.teams) {
        if (t.status === "active") seen.set(t.id, t.name);
      }
      for (const a of apiCache) {
        if (a.teamId && a.teamName) seen.set(a.teamId, a.teamName);
      }
      return [...seen.entries()].map(([id, name]) => ({ id, name }));
    }
    return listTeamFilterOptions();
  },
  reset() {
    if (isApiAuthMode()) {
      apiCache = [];
      return;
    }
    resetAchievementsStore();
  },
};
