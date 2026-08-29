import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAttendanceConfig } from "./api";
import type { AttendanceConfigDto } from "./types";

export type AttendanceConfigLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AttendanceConfigLoadState = {
  status: AttendanceConfigLoadStatus;
  items: AttendanceConfigDto[];
  errorMessage: string | null;
};

export async function loadAttendanceConfigList(
  activeInstituteId: string | null,
): Promise<AttendanceConfigLoadState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }
  try {
    const items = await listAttendanceConfig({ instituteId: activeInstituteId });
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
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
      err instanceof Error ? err.message : "Failed to load attendance configuration";
    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}
