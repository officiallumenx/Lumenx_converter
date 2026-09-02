import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  ComplaintDto,
  CreateComplaintInput,
  ListComplaintsParams,
  TransitionComplaintInput,
  UpdateComplaintInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Complaints API is only available in API auth mode");
  }
}

export async function listComplaints(
  params: ListComplaintsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ComplaintDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  if (params.destination) query.set("destination", params.destination);
  if (params.priority) query.set("priority", params.priority);
  if (params.studentId) query.set("student_id", params.studentId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);

  return client.get<ComplaintDto[]>(`/api/v1/complaints?${query.toString()}`);
}

export async function getComplaint(
  complaintId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ComplaintDto> {
  assertApiMode();
  if (!isInstituteUuid(complaintId)) {
    throw new Error("complaint_id must be a valid UUID");
  }
  return client.get<ComplaintDto>(`/api/v1/complaints/${complaintId.trim()}`);
}

export async function createComplaint(
  input: CreateComplaintInput,
  client: ConnectApiClient = getConnectApiClient(),
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
  client: ConnectApiClient = getConnectApiClient(),
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
  client: ConnectApiClient = getConnectApiClient(),
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
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(complaintId)) {
    throw new Error("complaint_id must be a valid UUID");
  }
  await client.delete(`/api/v1/complaints/${complaintId.trim()}`);
}
