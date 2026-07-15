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
  ActivityAchievement,
  ActivityAchievementInput,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const achievementsRepository = {
  async listAchievements(filters?: AchievementListFilters): Promise<ActivityAchievement[]> {
    await delay();
    return listAchievementsFromStore(filters);
  },
  getAchievementsSnapshot(): ActivityAchievement[] {
    return listAchievementsFromStore();
  },
  async getAchievementById(id: string): Promise<ActivityAchievement | null> {
    await delay(120);
    return getAchievementByIdFromStore(id);
  },
  async createAchievement(input: ActivityAchievementInput): Promise<ActivityAchievement> {
    await delay(280);
    return createAchievementInStore(input);
  },
  async updateAchievement(
    id: string,
    patch: Partial<ActivityAchievementInput>,
  ): Promise<ActivityAchievement> {
    await delay(280);
    return updateAchievementInStore(id, patch);
  },
  async awardAchievement(id: string): Promise<ActivityAchievement> {
    await delay(220);
    return awardAchievementInStore(id);
  },
  listEligibleSourceOptions(module: AchievementSourceModule) {
    return listEligibleSourceOptions(module);
  },
  listStudentFilterOptions() {
    return listStudentFilterOptions();
  },
  listTeamFilterOptions() {
    return listTeamFilterOptions();
  },
  reset() {
    resetAchievementsStore();
  },
};
