import { isApiAuthMode } from "@/auth/auth-mode";
import {
  cancelLeave,
  createStudentLeave,
  createTeacherLeave,
  decideLeave,
} from "./api";
import type {
  CreateStudentLeaveInput,
  CreateTeacherLeaveInput,
  DecideLeaveInput,
  DecideLeaveResult,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Leave API is only available in API auth mode");
  }
}

export async function submitStudentLeave(
  input: CreateStudentLeaveInput,
) {
  assertApiMode();
  return createStudentLeave(input);
}

export async function submitTeacherLeave(
  input: CreateTeacherLeaveInput,
) {
  assertApiMode();
  return createTeacherLeave(input);
}

export async function decideStudentLeave(
  leaveId: string,
  input: DecideLeaveInput,
): Promise<DecideLeaveResult> {
  assertApiMode();
  return decideLeave(leaveId, input);
}

export async function cancelPendingLeave(leaveId: string) {
  assertApiMode();
  return cancelLeave(leaveId);
}
