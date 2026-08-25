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

/**
 * Canonical Activity Coordinator hierarchy repository.
 * Sports + ECA structure for reuse by shared modules later.
 */
export const activityHierarchyRepository = {
  async listSportsByCategory(category: SportsCategory) {
    await delay();
    return listSportsByCategoryFromStore(category);
  },

  async listSports() {
    await delay();
    return listAllSportsFromStore();
  },

  async getSport(id: string) {
    await delay();
    return getSportByIdFromStore(id);
  },

  async createSport(input: CreateSportInput) {
    assertTeacherCanWrite();
    await delay();
    return createSportInStore(input);
  },

  async listTeamsBySport(sportId: string) {
    await delay();
    return listTeamsBySportFromStore(sportId);
  },

  async getTeam(id: string) {
    await delay();
    return getTeamByIdFromStore(id);
  },

  async createTeam(input: CreateTeamInput) {
    assertTeacherCanWrite();
    await delay();
    return createTeamInStore(input);
  },

  async setTeamStudents(teamId: string, students: HierarchyStudent[]) {
    assertTeacherCanWrite();
    await delay();
    return setTeamStudentsInStore(teamId, students);
  },

  async listEcaActivities() {
    await delay();
    return listEcaActivitiesFromStore();
  },

  async getEcaActivity(id: string) {
    await delay();
    return getEcaActivityByIdFromStore(id);
  },

  async createEcaActivity(input: CreateEcaActivityInput) {
    assertTeacherCanWrite();
    await delay();
    return createEcaActivityInStore(input);
  },

  async listGroupsByActivity(activityId: string) {
    await delay();
    return listGroupsByActivityFromStore(activityId);
  },

  async getGroup(id: string) {
    await delay();
    return getGroupByIdFromStore(id);
  },

  async createGroup(input: CreateGroupInput) {
    assertTeacherCanWrite();
    await delay();
    return createGroupInStore(input);
  },

  async setGroupStudents(groupId: string, students: HierarchyStudent[]) {
    assertTeacherCanWrite();
    await delay();
    return setGroupStudentsInStore(groupId, students);
  },

  /** For Phase 5+ shared modules — do not invent parallel team lists. */
  async listUnits(domain?: ActivityDomain) {
    await delay();
    return listUnitsFromStore(domain);
  },

  reset() {
    resetHierarchyStore();
  },
};
