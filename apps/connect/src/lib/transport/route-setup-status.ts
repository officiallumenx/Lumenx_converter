/**
 * Lightweight reader for Driver/Admin route-setup approval status (shared localStorage).
 * Connect only — does not mutate route setup.
 */

export type ConnectStopApprovalStatus = "none" | "pending" | "approved" | "declined";

const ROUTE_SETUP_KEY = "lumenx.transport.route-setup.v1";
export const TRANSPORT_APPROVAL_CHANGED_EVENT = "lumenx-transport-approval-changed";

type RouteSetupAssignmentLite = {
  studentId: string;
  stopName?: string;
  status?: string;
};

type RouteSetupStorageLite = {
  byRoute?: Record<string, { assignments?: RouteSetupAssignmentLite[] }>;
};

export function readConnectStopApprovalStatus(
  studentId: string,
): { status: ConnectStopApprovalStatus; stopName: string | null } {
  if (typeof localStorage === "undefined") {
    return { status: "none", stopName: null };
  }
  try {
    const raw = localStorage.getItem(ROUTE_SETUP_KEY);
    if (!raw) return { status: "none", stopName: null };
    const parsed = JSON.parse(raw) as RouteSetupStorageLite;
    const assignments: RouteSetupAssignmentLite[] = [];
    for (const route of Object.values(parsed.byRoute ?? {})) {
      for (const a of route.assignments ?? []) {
        if (a.studentId === studentId) assignments.push(a);
      }
    }
    if (assignments.length === 0) return { status: "none", stopName: null };
    const preferred =
      assignments.find((a) => a.status === "pending") ??
      assignments.find((a) => a.status === "approved") ??
      assignments[0]!;
    const statusRaw = preferred.status ?? "none";
    const status: ConnectStopApprovalStatus =
      statusRaw === "pending"
        ? "pending"
        : statusRaw === "approved"
          ? "approved"
          : statusRaw === "rejected"
            ? "declined"
            : "none";
    return { status, stopName: preferred.stopName ?? null };
  } catch {
    return { status: "none", stopName: null };
  }
}
