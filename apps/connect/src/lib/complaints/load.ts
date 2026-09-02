import { isApiAuthMode } from "@/auth/auth-mode";
import { listComplaints } from "./api";
import {
  complaintDtosToConnectItems,
  complaintDtosToTeacherItems,
} from "./map";
import type { ConnectComplaintItem } from "./types";

export type ComplaintsLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "unavailable";

export type LearnerComplaintsLoadState =
  | { status: "idle" | "loading" | "unavailable" }
  | { status: "ready"; items: ConnectComplaintItem[] }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export type TeacherComplaintsLoadState =
  | { status: "idle" | "loading" | "unavailable" }
  | {
      status: "ready";
      items: ReturnType<typeof complaintDtosToTeacherItems>;
    }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export async function loadLearnerComplaints(input: {
  instituteId: string;
  studentId?: string | null;
}): Promise<LearnerComplaintsLoadState> {
  if (!isApiAuthMode()) {
    return { status: "unavailable" };
  }
  try {
    const dtos = await listComplaints({
      instituteId: input.instituteId,
      studentId: input.studentId ?? undefined,
    });
    const items = complaintDtosToConnectItems(dtos);
    if (items.length === 0) {
      return { status: "empty", message: "No complaints yet." };
    }
    return { status: "ready", items };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load complaints",
    };
  }
}

export async function loadTeacherComplaints(input: {
  instituteId: string;
}): Promise<TeacherComplaintsLoadState> {
  if (!isApiAuthMode()) {
    return { status: "unavailable" };
  }
  try {
    const dtos = await listComplaints({ instituteId: input.instituteId });
    const items = complaintDtosToTeacherItems(dtos);
    if (items.length === 0) {
      return { status: "empty", message: "No complaints yet." };
    }
    return { status: "ready", items };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load complaints",
    };
  }
}
