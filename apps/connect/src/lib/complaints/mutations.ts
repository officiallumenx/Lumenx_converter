import { isApiAuthMode } from "@/auth/auth-mode";
import {
  createComplaint,
  deleteComplaint,
  transitionComplaint,
  updateComplaint,
} from "./api";
import { DEFAULT_DESTINATION, labelToPriority } from "./map";
import type {
  ComplaintDestination,
  ComplaintDto,
  ComplaintStatus,
  CreateComplaintInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Complaints API is only available in API auth mode");
  }
}

export async function submitLearnerComplaint(input: {
  instituteId: string;
  title: string;
  body: string;
  category: string;
  destination: ComplaintDestination;
  priority: "Low" | "Medium" | "High";
  studentId?: string | null;
  asDraft?: boolean;
}): Promise<ComplaintDto> {
  assertApiMode();
  return createComplaint({
    instituteId: input.instituteId,
    title: input.title,
    body: input.body,
    category: input.category,
    destination: input.destination ?? DEFAULT_DESTINATION,
    priority: labelToPriority(input.priority),
    studentId: input.studentId,
    asDraft: input.asDraft,
  });
}

export async function submitTeacherComplaint(input: {
  instituteId: string;
  title: string;
  body: string;
  category: string;
  priority: CreateComplaintInput["priority"];
  asDraft?: boolean;
}): Promise<ComplaintDto> {
  assertApiMode();
  return createComplaint({
    instituteId: input.instituteId,
    title: input.title,
    body: input.body,
    category: input.category,
    priority: input.priority ?? "medium",
    destination: "principal_admin",
    asDraft: input.asDraft,
  });
}

export async function patchComplaintDraft(
  complaintId: string,
  input: {
    title?: string;
    body?: string;
    category?: string;
    destination?: ComplaintDestination | null;
    priority?: CreateComplaintInput["priority"];
  },
): Promise<ComplaintDto> {
  assertApiMode();
  return updateComplaint(complaintId, input);
}

export async function transitionComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  responseNote?: string | null,
): Promise<ComplaintDto> {
  assertApiMode();
  return transitionComplaint(complaintId, { status, responseNote });
}

export async function removeComplaintDraft(complaintId: string): Promise<void> {
  assertApiMode();
  await deleteComplaint(complaintId);
}

/** Map teacher UI status action to backend transition. */
export function teacherActionToBackendStatus(
  action:
    | "submit_draft"
    | "respond"
    | "forward"
    | "resolve"
    | "close"
    | "archive",
): ComplaintStatus {
  switch (action) {
    case "submit_draft":
      return "pending";
    case "respond":
      return "review";
    case "forward":
      return "forwarded";
    case "resolve":
      return "resolved";
    case "close":
      return "closed";
    case "archive":
      return "archived";
  }
}
