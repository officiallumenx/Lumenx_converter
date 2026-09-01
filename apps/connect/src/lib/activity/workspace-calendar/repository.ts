import { isApiAuthMode } from "@/auth/auth-mode";
import { listPracticeSessions } from "@/lib/activity/api";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import { loadActivityApiHierarchy, getActivityApiSnapshot } from "@/lib/activity/api-store";
import {
  addPracticeToCalendarStore,
  clearDemoLinkedCalendarEntries,
  createReminderInStore,
  deleteReminderInStore,
  getCalendarEntryFromStore,
  getCalendarSnapshot,
  listCalendarEntriesFromStore,
  resetCalendarStore,
  setApiCalendarLinkedOverlay,
  subscribeCalendarStore,
  updateReminderInStore,
} from "./store";
import type {
  CreatePracticeCalendarInput,
  CreateReminderInput,
  UpdateReminderInput,
  WorkspaceCalendarEntry,
  WorkspaceCalendarFilters,
} from "./types";
import { WORKSPACE_CALENDAR_CATEGORY_COLORS } from "./types";

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

function useApi() {
  return isApiAuthMode();
}

function requireInstituteId(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

async function loadApiPracticeEntries(): Promise<WorkspaceCalendarEntry[]> {
  const instituteId = requireInstituteId();
  await loadActivityApiHierarchy();
  const snapshot = getActivityApiSnapshot();
  const teamById = new Map(snapshot.teams.map((t) => [t.id, t]));
  const sessions = await listPracticeSessions(instituteId);
  return sessions
    .filter((s) => s.status !== "cancelled")
    .map((s) => {
      const team = teamById.get(s.teamId);
      const section = team
        ? snapshot.sections.find((sec) => sec.id === team.sectionId)
        : undefined;
      const unitLabel = team
        ? `${section?.name ?? "Activity"} · ${team.name}`
        : undefined;
      return {
        id: s.id,
        title: s.title,
        date: s.scheduledOn,
        startTime: s.startTime ?? undefined,
        endTime: s.endTime ?? undefined,
        kind: "linked" as const,
        category: "practice" as const,
        description: s.notes ?? undefined,
        venue: s.location ?? undefined,
        unitId: s.teamId,
        unitLabel,
        sourceModule: "practice",
        sourceId: s.id,
        colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.practice,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
}

export const workspaceCalendarRepository = {
  subscribe: subscribeCalendarStore,
  getSnapshot: getCalendarSnapshot,

  async preload() {
    if (!useApi()) return;
    clearDemoLinkedCalendarEntries();
    const entries = await loadApiPracticeEntries();
    setApiCalendarLinkedOverlay(entries);
  },

  async listEntries(filters?: WorkspaceCalendarFilters) {
    if (useApi()) {
      return listCalendarEntriesFromStore(filters).map((e) => ({ ...e }));
    }
    await delay();
    return listCalendarEntriesFromStore(filters);
  },

  async getEntry(id: string) {
    await delay();
    return getCalendarEntryFromStore(id);
  },

  async createReminder(input: CreateReminderInput) {
    await delay();
    return createReminderInStore(input);
  },

  async updateReminder(id: string, patch: UpdateReminderInput) {
    await delay();
    return updateReminderInStore(id, patch);
  },

  async deleteReminder(id: string) {
    await delay();
    return deleteReminderInStore(id);
  },

  /** Called when coordinator assigns practice — appears on Calendar. */
  async addPractice(input: CreatePracticeCalendarInput) {
    if (useApi()) {
      await this.preload();
      const latest = getCalendarSnapshot().find(
        (e) =>
          e.sourceModule === "practice" &&
          e.date === input.date &&
          e.startTime === input.startTime &&
          input.unitIds.includes(e.unitId ?? ""),
      );
      if (latest) return latest;
      return {
        id: `practice-pending-${Date.now()}`,
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        kind: "linked" as const,
        category: "practice" as const,
        unitId: input.unitIds[0],
        unitLabel: input.unitLabels[0],
        sourceModule: "practice",
        colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.practice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies WorkspaceCalendarEntry;
    }
    await delay();
    return addPracticeToCalendarStore(input);
  },

  reset() {
    resetCalendarStore();
  },
};
