import { isApiAuthMode } from "@/auth/auth-mode";
import { getLearnerTransport, listTeacherClassTransport } from "./api";
import type { LearnerTransportParams, LearnerTransportSummary, TeacherClassTransportParams, TeacherClassTransportRow } from "./api-types";

export type TeacherClassTransportLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; rows: TeacherClassTransportRow[] }
  | { status: "error"; message: string }
  | { status: "unavailable" };

export type LearnerTransportLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; summary: LearnerTransportSummary }
  | { status: "empty"; message: string }
  | { status: "error"; message: string }
  | { status: "unavailable" };

export async function loadTeacherClassTransport(
  params: TeacherClassTransportParams,
): Promise<TeacherClassTransportLoadState> {
  if (!isApiAuthMode()) {
    return { status: "unavailable" };
  }
  try {
    const rows = await listTeacherClassTransport(params);
    return { status: "ready", rows };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load transport roster",
    };
  }
}

export async function loadLearnerTransport(
  params: LearnerTransportParams,
): Promise<LearnerTransportLoadState> {
  if (!isApiAuthMode()) {
    return { status: "unavailable" };
  }
  try {
    const summary = await getLearnerTransport(params);
    if (!summary.enrollmentId) {
      return { status: "empty", message: "No bus enrollment found for this student." };
    }
    return { status: "ready", summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load transport";
    if (message.toLowerCase().includes("not found")) {
      return { status: "empty", message: "No bus enrollment found for this student." };
    }
    return { status: "error", message };
  }
}
