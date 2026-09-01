import { isApiAuthMode } from "@/auth/auth-mode";
import {
  apiCreateEcaActivity,
  apiCreateGroup,
  apiCreateSport,
  apiCreateTeam,
  apiGetEcaActivity,
  apiGetGroup,
  apiGetSport,
  apiGetTeam,
  apiListEcaActivities,
  apiListGroupsByActivity,
  apiListSports,
  apiListSportsByCategory,
  apiListTeamsBySport,
  apiListUnits,
  apiSetGroupStudents,
  apiSetTeamStudents,
  loadActivityApiHierarchy,
  resetActivityApiStore,
} from "../api-store";
import {
  createEcaActivityInStore,
  createGroupInStore,
  createSportInStore,
  createTeamInStore,
  getEcaActivityByIdFromStore,
  getGroupByIdFromStore,
  getSportByIdFromStore,
  getTeamByIdFromStore,
  listAllSportsFromStore,
  listEcaActivitiesFromStore,
  listGroupsByActivityFromStore,
  listSportsByCategoryFromStore,
  listTeamsBySportFromStore,
  listUnitsFromStore,
  resetHierarchyStore,
  setGroupStudentsInStore,
  setTeamStudentsInStore,
} from "./store";
import type {
  ActivityDomain,
  CreateEcaActivityInput,
  CreateGroupInput,
  CreateSportInput,
  CreateTeamInput,
  HierarchyStudent,
  SportsCategory,
} from "./types";
import { assertTeacherCanWrite } from "@/lib/teacher/portal-access-guard";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function useApi() {
  return isApiAuthMode();
}

/**
 * Canonical Activity Coordinator hierarchy repository.
 * Sports + ECA structure for reuse by shared modules later.
 */
export const activityHierarchyRepository = {
  async preload() {
    if (!useApi()) return;
    await loadActivityApiHierarchy();
  },

  async listSportsByCategory(category: SportsCategory) {
    if (useApi()) return apiListSportsByCategory(category);
    await delay();
    return listSportsByCategoryFromStore(category);
  },

  async listSports() {
    if (useApi()) return apiListSports();
    await delay();
    return listAllSportsFromStore();
  },

  async getSport(id: string) {
    if (useApi()) return apiGetSport(id);
    await delay();
    return getSportByIdFromStore(id);
  },

  async createSport(input: CreateSportInput) {
    assertTeacherCanWrite();
    if (useApi()) return apiCreateSport(input);
    await delay();
    return createSportInStore(input);
  },

  async listTeamsBySport(sportId: string) {
    if (useApi()) return apiListTeamsBySport(sportId);
    await delay();
    return listTeamsBySportFromStore(sportId);
  },

  async getTeam(id: string) {
    if (useApi()) return apiGetTeam(id);
    await delay();
    return getTeamByIdFromStore(id);
  },

  async createTeam(input: CreateTeamInput) {
    assertTeacherCanWrite();
    if (useApi()) return apiCreateTeam(input);
    await delay();
    return createTeamInStore(input);
  },

  async setTeamStudents(teamId: string, students: HierarchyStudent[]) {
    assertTeacherCanWrite();
    if (useApi()) {
      const updated = await apiSetTeamStudents(teamId, students);
      if (!updated) throw new Error("Team not found");
      return updated;
    }
    await delay();
    const updated = setTeamStudentsInStore(teamId, students);
    if (!updated) throw new Error("Team not found");
    return updated;
  },

  async listEcaActivities() {
    if (useApi()) return apiListEcaActivities();
    await delay();
    return listEcaActivitiesFromStore();
  },

  async getEcaActivity(id: string) {
    if (useApi()) return apiGetEcaActivity(id);
    await delay();
    return getEcaActivityByIdFromStore(id);
  },

  async createEcaActivity(input: CreateEcaActivityInput) {
    assertTeacherCanWrite();
    if (useApi()) return apiCreateEcaActivity(input);
    await delay();
    return createEcaActivityInStore(input);
  },

  async listGroupsByActivity(activityId: string) {
    if (useApi()) return apiListGroupsByActivity(activityId);
    await delay();
    return listGroupsByActivityFromStore(activityId);
  },

  async getGroup(id: string) {
    if (useApi()) return apiGetGroup(id);
    await delay();
    return getGroupByIdFromStore(id);
  },

  async createGroup(input: CreateGroupInput) {
    assertTeacherCanWrite();
    if (useApi()) return apiCreateGroup(input);
    await delay();
    return createGroupInStore(input);
  },

  async setGroupStudents(groupId: string, students: HierarchyStudent[]) {
    assertTeacherCanWrite();
    if (useApi()) {
      const updated = await apiSetGroupStudents(groupId, students);
      if (!updated) throw new Error("Group not found");
      return updated;
    }
    await delay();
    const updated = setGroupStudentsInStore(groupId, students);
    if (!updated) throw new Error("Group not found");
    return updated;
  },

  /** For Phase 5+ shared modules — do not invent parallel team lists. */
  async listUnits(domain?: ActivityDomain) {
    if (useApi()) return apiListUnits(domain);
    await delay();
    return listUnitsFromStore(domain);
  },

  reset() {
    if (useApi()) {
      resetActivityApiStore();
      return;
    }
    resetHierarchyStore();
  },
};
