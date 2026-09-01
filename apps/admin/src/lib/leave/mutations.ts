/**
 * Leave write API — decide / cancel. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { DecideLeaveResult, LeaveRequestDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Leave API is only available in API auth mode");
  }
}

export type LeaveDecisionOutcome = "approved" | "rejected" | "ignored";

export type DecideLeaveInput = {
  outcome: LeaveDecisionOutcome;
  note?: string | null;
};

export async function decideLeave(
  leaveId: string,
  input: DecideLeaveInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DecideLeaveResult> {
  assertApiMode();
  if (!isInstituteUuid(leaveId)) {
    throw new Error("leave_id must be a valid UUID");
  }
  return client.post<DecideLeaveResult>(
    `/api/v1/leave/requests/${leaveId.trim()}/decide`,
    {
      outcome: input.outcome,
      note: input.note,
    },
  );
}

export async function cancelLeave(
  leaveId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<LeaveRequestDto> {
  assertApiMode();
  if (!isInstituteUuid(leaveId)) {
    throw new Error("leave_id must be a valid UUID");
  }
  return client.post<LeaveRequestDto>(
    `/api/v1/leave/requests/${leaveId.trim()}/cancel`,
  );
}
