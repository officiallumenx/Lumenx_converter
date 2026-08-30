/**
 * Complaints write API — update / transition. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ComplaintDestination,
  ComplaintDto,
  ComplaintPriority,
  ComplaintStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Complaints API is only available in API auth mode");
  }
}

export type UpdateComplaintInput = {
  title?: string;
  body?: string;
  category?: string;
  priority?: ComplaintPriority;
  destination?: ComplaintDestination | null;
};

export type TransitionComplaintInput = {
  status: ComplaintStatus;
  responseNote?: string | null;
};

export type CreateComplaintInput = {
  instituteId: string;
  title: string;
  body: string;
  category: string;
  priority?: ComplaintPriority;
  destination?: ComplaintDestination | null;
  studentId?: string | null;
  asDraft?: boolean;
};

export async function createComplaint(
  input: CreateComplaintInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ComplaintDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<ComplaintDto>("/api/v1/complaints", {
    institute_id: input.instituteId.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category.trim(),
    priority: input.priority,
    destination: input.destination,
    student_id: input.studentId,
    as_draft: input.asDraft,
  });
}

export async function updateComplaint(
  complaintId: string,
  input: UpdateComplaintInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ComplaintDto> {
  assertApiMode();
  if (!isInstituteUuid(complaintId)) {
    throw new Error("complaint_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title.trim();
  if (input.body !== undefined) body.body = input.body.trim();
  if (input.category !== undefined) body.category = input.category.trim();
  if (input.priority !== undefined) body.priority = input.priority;
  if (input.destination !== undefined) body.destination = input.destination;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<ComplaintDto>(
    `/api/v1/complaints/${complaintId.trim()}`,
    body,
  );
}

export async function transitionComplaint(
  complaintId: string,
  input: TransitionComplaintInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ComplaintDto> {
  assertApiMode();
  if (!isInstituteUuid(complaintId)) {
    throw new Error("complaint_id must be a valid UUID");
  }
  return client.post<ComplaintDto>(
    `/api/v1/complaints/${complaintId.trim()}/transition`,
    {
      status: input.status,
      response_note: input.responseNote,
    },
  );
}

export async function deleteComplaint(
  complaintId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(complaintId)) {
    throw new Error("complaint_id must be a valid UUID");
  }
  await client.delete(`/api/v1/complaints/${complaintId.trim()}`);
}
