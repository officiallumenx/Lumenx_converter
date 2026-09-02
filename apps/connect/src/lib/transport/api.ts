import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  LearnerTransportLiveDto,
  LearnerTransportLiveParams,
  LearnerTransportParams,
  LearnerTransportSummary,
  ListTransportEnrollmentsParams,
  ListTransportRoutesParams,
  ListTransportStopsParams,
  RouteDto,
  StopDto,
  TeacherClassTransportParams,
  TeacherClassTransportRow,
  TransportEnrollmentDto,
} from "./api-types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport API is only available in API auth mode");
  }
}

export async function listTransportRoutes(
  params: ListTransportRoutesParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<RouteDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<RouteDto[]>(`/api/v1/transport/routes?${query.toString()}`);
}

export async function listTransportStops(
  params: ListTransportStopsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StopDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.routeId)) {
    throw new Error("route_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("route_id", params.routeId.trim());
  return client.get<StopDto[]>(`/api/v1/transport/stops?${query.toString()}`);
}

export async function listTransportEnrollments(
  params: ListTransportEnrollmentsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<TransportEnrollmentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<TransportEnrollmentDto[]>(
    `/api/v1/transport/enrollments?${query.toString()}`,
  );
}

export async function getLearnerTransport(
  params: LearnerTransportParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LearnerTransportSummary> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("student_id", params.studentId.trim());
  return client.get<LearnerTransportSummary>(
    `/api/v1/transport/portal/learner-transport?${query.toString()}`,
  );
}

export async function getLearnerTransportLive(
  params: LearnerTransportLiveParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LearnerTransportLiveDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("student_id", params.studentId.trim());
  return client.get<LearnerTransportLiveDto>(
    `/api/v1/transport/portal/learner-transport/live?${query.toString()}`,
  );
}

export async function listTeacherClassTransport(
  params: TeacherClassTransportParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<TeacherClassTransportRow[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.classLabel?.trim()) {
    query.set("class_label", params.classLabel.trim());
  }
  if (params.sectionLabel?.trim()) {
    query.set("section_label", params.sectionLabel.trim());
  }
  return client.get<TeacherClassTransportRow[]>(
    `/api/v1/transport/portal/teacher-class-roster?${query.toString()}`,
  );
}
