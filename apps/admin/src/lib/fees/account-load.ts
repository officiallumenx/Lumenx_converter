import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getStudentFeeAccount } from "./api";
import type { StudentFeeAccountDto } from "./types";

export type StudentFeeAccountLoadStatus =
  | "demo"
  | "idle"
  | "loading"
  | "ready"
  | "invalid"
  | "forbidden"
  | "error";

export type StudentFeeAccountLoadState = {
  status: StudentFeeAccountLoadStatus;
  account: StudentFeeAccountDto | null;
  errorMessage: string | null;
};

export async function loadStudentFeeAccountView(input: {
  planId: string | null;
  studentId: string | null;
  classId: string | null;
}): Promise<StudentFeeAccountLoadState> {
  if (!isApiAuthMode()) {
    return { status: "demo", account: null, errorMessage: null };
  }
  if (!input.studentId) {
    return { status: "idle", account: null, errorMessage: null };
  }
  if (
    !input.planId ||
    !input.classId ||
    !isInstituteUuid(input.planId) ||
    !isInstituteUuid(input.studentId) ||
    !isInstituteUuid(input.classId)
  ) {
    return {
      status: "invalid",
      account: null,
      errorMessage: "Select a student with a valid class assignment.",
    };
  }
  try {
    const account = await getStudentFeeAccount({
      planId: input.planId,
      studentId: input.studentId,
      classId: input.classId,
    });
    return { status: "ready", account, errorMessage: null };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message =
      err instanceof Error ? err.message : "Failed to load student fee account";
    if (status === 403) {
      return { status: "forbidden", account: null, errorMessage: message };
    }
    return { status: "error", account: null, errorMessage: message };
  }
}

export function shouldCommitStudentFeeAccountLoad(opts: {
  cancelled: boolean;
  requestKey: string;
  activeKey: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeKey) return false;
  return opts.requestKey === opts.activeKey;
}
