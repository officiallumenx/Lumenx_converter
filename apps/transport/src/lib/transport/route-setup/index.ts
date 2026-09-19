import { repositoryDelay } from "../utils";
import { listApiEnrollmentsForVehicle } from "../api-roster";
import {
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
  startRouteSetupSession,
  studentIdsAssignedElsewhere,
  subscribeRouteSetup,
  upsertRouteSetupStop,
  findDuplicateRouteStop,
} from "./store";
import type { StudentDirectoryEntry, UpsertStopInput } from "./types";

export type { SubmissionStatus, StudentStopAssignment, RouteSetupStop } from "./types";
export {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_HINT,
  canEditStop,
  canEditAssignment,
  canRequestChangeStop,
} from "./types";
export { findDuplicateRouteStop, TRANSPORT_APPROVAL_CHANGED_EVENT } from "./store";

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

  studentsByIds(ids: string[]): StudentDirectoryEntry[] {
    const byId = new Map(
      listApiEnrollmentsForVehicle().map((e) => [e.studentId, e] as const),
    );
    const out: StudentDirectoryEntry[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (row) {
        const [className, section = ""] = row.studentClass.split("-");
        out.push({
          id: row.studentId,
          name: row.studentName,
          className: className || row.studentClass,
          section,
          rollNo: row.studentId,
        });
        continue;
      }
      out.push({
        id,
        name: id,
        className: "—",
        section: "",
        rollNo: id,
      });
    }
    return out;
  },

  reset() {
    resetRouteSetupStore();
  },
};
