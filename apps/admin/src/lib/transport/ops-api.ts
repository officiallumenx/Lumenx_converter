import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  GetTransportAnalyticsParams,
  ListTransportBoardingMarksParams,
  ListTransportEmergenciesParams,
  ListTransportTripsParams,
  TransportAnalyticsDto,
  TransportBoardingEventDto,
  TransportEmergencyDto,
  TransportTripDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport ops API is only available in API auth mode");
  }
}

export async function getTransportTrip(
  tripId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportTripDto> {
  assertApiMode();
  if (!isInstituteUuid(tripId)) {
    throw new Error("trip id must be a valid UUID");
  }
  return client.get<TransportTripDto>(`/api/v1/transport/trips/${tripId.trim()}`);
}

export type EffectiveTripParticipantDto = {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  pickupStopId: string | null;
  dropStopId: string | null;
  notRidingToday: boolean;
  exceptionId: string | null;
  exceptionReason: string | null;
};

export type EffectiveTripParticipantsDto = {
  tripId: string;
  instituteId: string;
  routeId: string;
  serviceDate: string;
  expectedCount: number;
  notRidingCount: number;
  expectedOnboardCount: number;
  participants: EffectiveTripParticipantDto[];
  expectedOnboard: EffectiveTripParticipantDto[];
  notRiding: EffectiveTripParticipantDto[];
};

export async function getTripEffectiveParticipants(
  tripId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EffectiveTripParticipantsDto> {
  assertApiMode();
  if (!isInstituteUuid(tripId)) {
    throw new Error("trip id must be a valid UUID");
  }
  return client.get<EffectiveTripParticipantsDto>(
    `/api/v1/transport/trips/${tripId.trim()}/effective-participants`,
  );
}

export async function listTransportTrips(
  params: ListTransportTripsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportTripDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.tripDate?.trim()) query.set("trip_date", params.tripDate.trim());
  return client.get<TransportTripDto[]>(`/api/v1/transport/trips?${query.toString()}`);
}

export async function listTransportBoardingMarks(
  params: ListTransportBoardingMarksParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportBoardingEventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.tripDate?.trim()) query.set("trip_date", params.tripDate.trim());
  return client.get<TransportBoardingEventDto[]>(
    `/api/v1/transport/boarding-marks?${query.toString()}`,
  );
}

export async function listTransportEmergencies(
  params: ListTransportEmergenciesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEmergencyDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  return client.get<TransportEmergencyDto[]>(
    `/api/v1/transport/emergencies?${query.toString()}`,
  );
}

export async function acknowledgeTransportEmergencyApi(
  emergencyId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEmergencyDto> {
  assertApiMode();
  return client.post<TransportEmergencyDto>(
    `/api/v1/transport/emergencies/${emergencyId}/acknowledge`,
  );
}

export async function resolveTransportEmergencyApi(
  emergencyId: string,
  resolveNote?: string | null,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEmergencyDto> {
  assertApiMode();
  return client.post<TransportEmergencyDto>(
    `/api/v1/transport/emergencies/${emergencyId}/resolve`,
    { resolve_note: resolveNote ?? null },
  );
}

export async function getTransportAnalytics(
  params: GetTransportAnalyticsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportAnalyticsDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.tripDate?.trim()) query.set("trip_date", params.tripDate.trim());
  return client.get<TransportAnalyticsDto>(
    `/api/v1/transport/analytics?${query.toString()}`,
  );
}

export type TransportExportReportId =
  | "transport"
  | "transport-trips"
  | "transport-attendance"
  | "transport-emergencies";

export async function exportTransportReport(
  instituteId: string,
  reportId: TransportExportReportId,
): Promise<{ fileName: string; blob: Blob }> {
  assertApiMode();
  const { createReportJob, downloadReportJob } = await import("@/lib/reports/api");
  const job = await createReportJob({ instituteId, reportId });
  if (job.status !== "ready") {
    throw new Error(job.errorMessage ?? `Export failed for ${reportId}`);
  }
  const { blob, fileName } = await downloadReportJob(job.id);
  return { fileName, blob };
}

export type TransportDailyExceptionDto = {
  id: string;
  instituteId: string;
  studentId: string;
  serviceDate: string;
  exceptionType: "NOT_RIDING";
  reason: "parent" | "admin" | "driver" | "system";
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  undoCutoffAt: string | null;
  canUndo: boolean;
};

export async function listTransportDailyExceptions(params: {
  instituteId: string;
  serviceDate: string;
  studentId?: string;
}): Promise<TransportDailyExceptionDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("date", params.serviceDate.trim());
  if (params.studentId?.trim()) query.set("student_id", params.studentId.trim());
  const client = getAdminApiClient();
  return client.get<TransportDailyExceptionDto[]>(
    `/api/v1/transport/daily-exceptions?${query.toString()}`,
  );
}

export async function cancelTransportDailyException(
  exceptionId: string,
): Promise<TransportDailyExceptionDto> {
  assertApiMode();
  if (!isInstituteUuid(exceptionId)) {
    throw new Error("exception id must be a valid UUID");
  }
  const client = getAdminApiClient();
  return client.delete<TransportDailyExceptionDto>(
    `/api/v1/transport/daily-exceptions/${exceptionId.trim()}`,
  );
}

export async function createTransportDailyException(params: {
  instituteId: string;
  studentId: string;
  serviceDate?: string;
  notes?: string | null;
}): Promise<TransportDailyExceptionDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const client = getAdminApiClient();
  return client.post<TransportDailyExceptionDto>(`/api/v1/transport/daily-exceptions`, {
    institute_id: params.instituteId.trim(),
    student_id: params.studentId.trim(),
    exception_type: "NOT_RIDING",
    ...(params.serviceDate?.trim() ? { service_date: params.serviceDate.trim() } : {}),
    ...(params.notes !== undefined ? { notes: params.notes } : {}),
  });
}
