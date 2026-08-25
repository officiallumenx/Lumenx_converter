import {
  getAchievementsSnapshot,
  recordStudentAchievementsInStore,
  recordUnitAchievementInStore,
  resetAchievementsStore,
  subscribeAchievementsStore,
  type RecordStudentAchievementsInput,
  type RecordUnitAchievementInput,
} from "./store";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const workspaceAchievementsRepository = {
  subscribe: subscribeAchievementsStore,
  getSnapshot: getAchievementsSnapshot,

  async recordUnit(input: RecordUnitAchievementInput) {
    await delay();
    return recordUnitAchievementInStore(input);
  },

  async recordStudents(input: RecordStudentAchievementsInput) {
    await delay();
    return recordStudentAchievementsInStore(input);
  },

  reset() {
    resetAchievementsStore();
  },
};
