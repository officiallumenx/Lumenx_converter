import { ApiClientError } from "@/lib/api";
import {
  approveRegistration,
  rejectRegistration,
} from "./api";
import type { InstituteRegistrationDto } from "./types";

export type ReviewActionKind = "approve" | "reject";

export type ReviewActionSuccess = {
  ok: true;
  action: ReviewActionKind;
  registration: InstituteRegistrationDto;
};

export type ReviewActionFailure = {
  ok: false;
  action: ReviewActionKind;
  message: string;
  unauthorized: boolean;
  forbidden: boolean;
};

export type ReviewActionResult = ReviewActionSuccess | ReviewActionFailure;

function toFailure(
  action: ReviewActionKind,
  err: unknown,
): ReviewActionFailure {
  if (err instanceof ApiClientError) {
    return {
      ok: false,
      action,
      message: err.message,
      unauthorized: err.status === 401 || err.code === "UNAUTHENTICATED",
      forbidden: err.status === 403 || err.code === "FORBIDDEN",
    };
  }
  return {
    ok: false,
    action,
    message: err instanceof Error ? err.message : "Review action failed.",
    unauthorized: false,
    forbidden: false,
  };
}

/** Approve via POST /api/nexus/registrations/:id/approve — never writes demo/localStorage. */
export async function performApiApprove(
  registrationId: string,
): Promise<ReviewActionResult> {
  try {
    const registration = await approveRegistration(registrationId);
    return { ok: true, action: "approve", registration };
  } catch (err) {
    return toFailure("approve", err);
  }
}

/** Reject via POST /api/nexus/registrations/:id/reject — never writes demo/localStorage. */
export async function performApiReject(
  registrationId: string,
  reason: string,
): Promise<ReviewActionResult> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return {
      ok: false,
      action: "reject",
      message: "A rejection reason is required.",
      unauthorized: false,
      forbidden: false,
    };
  }
  try {
    const registration = await rejectRegistration(registrationId, trimmed);
    return { ok: true, action: "reject", registration };
  } catch (err) {
    return toFailure("reject", err);
  }
}
