import { isApiAuthMode } from "@/auth/auth-mode";
import { createAchievement, listAchievements } from "@/lib/activity/api";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import { getActivityApiSnapshot, loadActivityApiHierarchy } from "@/lib/activity/api-store";
import { membershipsForTeam } from "@/lib/activity/map";
import {
  getAchievementsSnapshot,
  recordStudentAchievementsInStore,
  recordUnitAchievementInStore,
  resetAchievementsStore,
  subscribeAchievementsStore,
  type RecordStudentAchievementsInput,
  type RecordUnitAchievementInput,
  type RecordedAchievement,
} from "./store";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function useApi() {
  return isApiAuthMode();
}

function requireInstituteId(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

let apiRecords: RecordedAchievement[] = [];
const apiListeners = new Set<() => void>();

function emitApi() {
  apiListeners.forEach((l) => l());
}

async function loadApiAchievements(): Promise<RecordedAchievement[]> {
  const instituteId = requireInstituteId();
  const rows = await listAchievements(instituteId);
  return rows.map((row) => ({
    id: row.id,
    scope: "student" as const,
    title: row.title,
    domain: "sports" as const,
    unitId: row.teamId ?? "",
    unitLabel: row.teamId ?? "Team",
    unitKind: "team" as const,
    studentId: row.studentId,
    recordedAt: row.awardedOn,
  }));
}

export const workspaceAchievementsRepository = {
  subscribe(listener: () => void) {
    if (useApi()) {
      apiListeners.add(listener);
      return () => apiListeners.delete(listener);
    }
    return subscribeAchievementsStore(listener);
  },

  getSnapshot(): RecordedAchievement[] {
    if (useApi()) return apiRecords;
    return getAchievementsSnapshot();
  },

  async preload() {
    if (!useApi()) return;
    apiRecords = await loadApiAchievements();
    emitApi();
  },

  async recordUnit(input: RecordUnitAchievementInput) {
    if (useApi()) {
      const instituteId = requireInstituteId();
      await loadActivityApiHierarchy();
      const snapshot = getActivityApiSnapshot();
      const memberIds = membershipsForTeam(input.unitId, snapshot.memberships).map(
        (m) => m.studentId,
      );
      const awardedOn = todayIsoDate();
      const created: RecordedAchievement[] = [];

      if (memberIds.length === 0) {
        throw new Error("No students on this roster");
      }

      for (const studentId of memberIds) {
        const row = await createAchievement({
          instituteId,
          studentId,
          teamId: input.unitId,
          title: input.title,
          awardedOn,
          kind: "award",
          notes: `Unit achievement (${input.unitLabel})`,
        });
        created.push({
          id: row.id,
          scope: "unit",
          title: input.title,
          domain: input.domain,
          unitId: input.unitId,
          unitLabel: input.unitLabel,
          unitKind: input.unitKind,
          studentId,
          recordedAt: row.createdAt,
        });
      }

      apiRecords = [...created, ...apiRecords];
      emitApi();
      return created[0];
    }
    await delay();
    return recordUnitAchievementInStore(input);
  },

  async recordStudents(input: RecordStudentAchievementsInput) {
    if (useApi()) {
      const instituteId = requireInstituteId();
      const awardedOn = todayIsoDate();
      const created: RecordedAchievement[] = [];
      for (const student of input.students) {
        const row = await createAchievement({
          instituteId,
          studentId: student.id,
          teamId: input.unitId,
          title: input.title,
          awardedOn,
          kind: "award",
        });
        created.push({
          id: row.id,
          scope: "student",
          title: input.title,
          domain: input.domain,
          unitId: input.unitId,
          unitLabel: input.unitLabel,
          unitKind: input.unitKind,
          studentId: student.id,
          studentName: student.name,
          recordedAt: row.createdAt,
        });
      }
      apiRecords = [...created, ...apiRecords];
      emitApi();
      return created;
    }
    await delay();
    return recordStudentAchievementsInStore(input);
  },

  reset() {
    if (useApi()) {
      apiRecords = [];
      emitApi();
      return;
    }
    resetAchievementsStore();
  },
};
