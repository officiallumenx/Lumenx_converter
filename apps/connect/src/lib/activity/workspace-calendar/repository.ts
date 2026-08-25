import {
  addPracticeToCalendarStore,
  createReminderInStore,
  deleteReminderInStore,
  getCalendarEntryFromStore,
  getCalendarSnapshot,
  listCalendarEntriesFromStore,
  resetCalendarStore,
  subscribeCalendarStore,
  updateReminderInStore,
} from "./store";
import type {
  CreatePracticeCalendarInput,
  CreateReminderInput,
  UpdateReminderInput,
  WorkspaceCalendarFilters,
} from "./types";

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

export const workspaceCalendarRepository = {
  subscribe: subscribeCalendarStore,
  getSnapshot: getCalendarSnapshot,

  async listEntries(filters?: WorkspaceCalendarFilters) {
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
    await delay();
    return addPracticeToCalendarStore(input);
  },

  reset() {
    resetCalendarStore();
  },
};
