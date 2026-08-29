/**
 * Fees API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ConcessionDto,
  FeeComponentDto,
  FeePaymentDto,
  FeePlanDto,
  GetStudentFeeAccountParams,
  ListFeeComponentsParams,
  ListFeeConcessionsParams,
  ListFeePaymentsParams,
  ListFeePlansParams,
  StudentFeeAccountDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Fees API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listFeePlans(
  params: ListFeePlansParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePlanDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<FeePlanDto[]>(`/api/v1/fees/plans?${query.toString()}`);
}

export async function listFeeComponents(
  params: ListFeeComponentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeeComponentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.planId)) {
    throw new Error("plan_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("plan_id", params.planId.trim());
  return client.get<FeeComponentDto[]>(`/api/v1/fees/components?${query.toString()}`);
}

export async function listFeeConcessions(
  params: ListFeeConcessionsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ConcessionDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.planId)) {
    throw new Error("plan_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("plan_id", params.planId.trim());
  if (params.studentId) {
    if (!isInstituteUuid(params.studentId)) {
      throw new Error("student_id must be a valid UUID");
    }
    query.set("student_id", params.studentId.trim());
  }
  return client.get<ConcessionDto[]>(`/api/v1/fees/concessions?${query.toString()}`);
}

export async function listFeePayments(
  params: ListFeePaymentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePaymentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.planId)) {
    throw new Error("plan_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("plan_id", params.planId.trim());
  if (params.studentId) {
    if (!isInstituteUuid(params.studentId)) {
      throw new Error("student_id must be a valid UUID");
    }
    query.set("student_id", params.studentId.trim());
  }
  return client.get<FeePaymentDto[]>(`/api/v1/fees/payments?${query.toString()}`);
}

export async function getStudentFeeAccount(
  params: GetStudentFeeAccountParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StudentFeeAccountDto> {
  assertApiMode();
  if (!isInstituteUuid(params.planId)) {
    throw new Error("plan_id must be a valid UUID");
  }
  if (!isInstituteUuid(params.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  if (!isInstituteUuid(params.classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("plan_id", params.planId.trim());
  query.set("class_id", params.classId.trim());
  return client.get<StudentFeeAccountDto>(
    `/api/v1/fees/accounts/${params.studentId.trim()}?${query.toString()}`,
  );
}
