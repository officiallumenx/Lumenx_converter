import { isApiAuthMode } from "@/auth/auth-mode";
import { listTeacherClassTransport } from "./api";
import type { TeacherClassTransportParams, TeacherClassTransportRow } from "./types";

export type TeacherClassTransportLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; rows: TeacherClassTransportRow[] }
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
