import { loadTransportOps } from "@lumenx/utils";
import { repositoryDelay } from "../utils";
import {
  ROUTE_SETUP_STUDENT_DIRECTORY,
  listClasses,
  listSections,
  listStudents,
  studentsByIds,
} from "./student-directory";
import {
  applyAdminApproveStop,
  applyAdminDeclineStop,
  deleteRouteSetupStop,
  finishRouteSetup,
  getRouteSetupForAdmin,
  getRouteSetupSnapshot,
  listAssignmentsByStatus,
  listStopsByStatus,
  movePendingAssignment,
  removePendingAssignment,
  reorderRouteSetupStop,
  resetRouteSetupStore,
  setRouteSetupAdminLock,
  startRouteSetupSession,
  studentIdsAssignedElsewhere,
  subscribeRouteSetup,
  upsertRouteSetupStop,
  findDuplicateRouteStop,
} from "./store";
import type { StudentDirectoryEntry, SubmissionStatus, UpsertStopInput } from "./types";

export type { SubmissionStatus, StudentStopAssignment, RouteSetupStop } from "./types";
export {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_HINT,
  canEditStop,
  canEditAssignment,
  canRequestChangeStop,
} from "./types";
export {
  applyAdminApproveStop,
  applyAdminDeclineStop,
  findDuplicateRouteStop,
  TRANSPORT_APPROVAL_CHANGED_EVENT,
} from "./store";

export const routeSetupRepository = {
  subscribe: subscribeRouteSetup,
  getSnapshot: getRouteSetupSnapshot,
  getAdminView: getRouteSetupForAdmin,
  listStopsByStatus,
  listAssignmentsByStatus,
  studentIdsAssignedElsewhere,

  async getRecord() {
    await repositoryDelay();
    return getRouteSetupSnapshot();
  },

  async startSetup(createdBy: string) {
    await repositoryDelay(40);
    return startRouteSetupSession(createdBy);
  },

  async saveStop(input: UpsertStopInput, createdBy: string) {
    await repositoryDelay(60);
    return upsertRouteSetupStop(input, createdBy);
  },

  async deleteStop(stopId: string) {
    await repositoryDelay(40);
    return deleteRouteSetupStop(stopId);
  },

  async reorderStop(stopId: string, direction: "up" | "down") {
    await repositoryDelay(30);
    return reorderRouteSetupStop(stopId, direction);
  },

  async removeAssignment(assignmentId: string) {
    await repositoryDelay(40);
    return removePendingAssignment(assignmentId);
  },

  async moveAssignment(assignmentId: string, targetStopId: string) {
    await repositoryDelay(40);
    return movePendingAssignment(assignmentId, targetStopId);
  },

  async finishSetup() {
    await repositoryDelay(60);
    return finishRouteSetup();
  },

  /** Reserved for Admin sync later — mock only. */
  async setAdminLock(locked: boolean) {
    await repositoryDelay(40);
    return setRouteSetupAdminLock(locked);
  },

  async approveStop(stopId: string) {
    await repositoryDelay(40);
    return applyAdminApproveStop(stopId);
  },

  async declineStop(stopId: string, reason?: string) {
    await repositoryDelay(40);
    return applyAdminDeclineStop(stopId, reason);
  },

  listClasses() {
    return listClasses(ROUTE_SETUP_STUDENT_DIRECTORY);
  },

  listSections(className: string) {
    return listSections(className, ROUTE_SETUP_STUDENT_DIRECTORY);
  },

  listStudents(className: string, section: string) {
    return listStudents(className, section, ROUTE_SETUP_STUDENT_DIRECTORY);
  },

  studentsByIds(ids: string[]): StudentDirectoryEntry[] {
    const fromDir = studentsByIds(ids, ROUTE_SETUP_STUDENT_DIRECTORY);
    const found = new Set(fromDir.map((s) => s.id));
    const fromEnroll = loadTransportOps()
      .enrollments.filter((e) => ids.includes(e.studentId) && !found.has(e.studentId))
      .map(
        (e): StudentDirectoryEntry => ({
          id: e.studentId,
          name: e.studentName,
          className: e.studentClass.split("-")[0] ?? e.studentClass,
          section: e.studentClass.split("-")[1] ?? "",
          rollNo: e.studentId,
        }),
      );
    return [...fromDir, ...fromEnroll];
  },

  reset() {
    resetRouteSetupStore();
  },
};
