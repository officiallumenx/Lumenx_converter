/**
 * Fees write API — plans / components / concessions / payments. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ConcessionDto,
  FeeComponentDto,
  FeeComponentKind,
  FeePaymentDto,
  FeePaymentMethod,
  FeePlanDto,
  FeePublishScope,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Fees API is only available in API auth mode");
  }
}

export type CreateFeePlanInput = {
  instituteId: string;
  academicYearId: string;
};

export type PublishFeePlanInput = {
  publishScope: FeePublishScope;
  publishedClassIds?: string[];
};

export type CreateFeeComponentInput = {
  feePlanId: string;
  kind: FeeComponentKind;
  name: string;
  active?: boolean;
  assignedToAll?: boolean;
  assignedClassIds?: string[];
  classAmounts?: Record<string, number>;
};

export type UpdateFeeComponentInput = {
  name?: string;
  active?: boolean;
  assignedToAll?: boolean;
  assignedClassIds?: string[];
  classAmounts?: Record<string, number>;
};

export type UpsertConcessionInput = {
  feePlanId: string;
  studentId: string;
  feeComponentId: string;
  amount: number;
  note?: string | null;
};

export type RecordPaymentInput = {
  feePlanId: string;
  studentId: string;
  classId: string;
  amount: number;
  method: FeePaymentMethod;
  paidOn: string;
  note: string;
};

export type VoidPaymentInput = {
  paymentId: string;
  reason: string;
};

export async function createFeePlan(
  input: CreateFeePlanInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePlanDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  return client.post<FeePlanDto>("/api/v1/fees/plans", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
  });
}

export async function publishFeePlan(
  planId: string,
  input: PublishFeePlanInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePlanDto> {
  assertApiMode();
  if (!isInstituteUuid(planId)) {
    throw new Error("plan_id must be a valid UUID");
  }
  return client.post<FeePlanDto>(`/api/v1/fees/plans/${planId.trim()}/publish`, {
    publish_scope: input.publishScope,
    published_class_ids: input.publishedClassIds,
  });
}

export async function unpublishFeePlan(
  planId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePlanDto> {
  assertApiMode();
  if (!isInstituteUuid(planId)) {
    throw new Error("plan_id must be a valid UUID");
  }
  return client.post<FeePlanDto>(
    `/api/v1/fees/plans/${planId.trim()}/unpublish`,
  );
}

export async function createFeeComponent(
  input: CreateFeeComponentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeeComponentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.feePlanId)) {
    throw new Error("fee_plan_id must be a valid UUID");
  }
  return client.post<FeeComponentDto>("/api/v1/fees/components", {
    fee_plan_id: input.feePlanId.trim(),
    kind: input.kind,
    name: input.name.trim(),
    active: input.active,
    assigned_to_all: input.assignedToAll,
    assigned_class_ids: input.assignedClassIds,
    class_amounts: input.classAmounts,
  });
}

export async function updateFeeComponent(
  componentId: string,
  input: UpdateFeeComponentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeeComponentDto> {
  assertApiMode();
  if (!isInstituteUuid(componentId)) {
    throw new Error("component_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.active !== undefined) body.active = input.active;
  if (input.assignedToAll !== undefined) body.assigned_to_all = input.assignedToAll;
  if (input.assignedClassIds !== undefined) {
    body.assigned_class_ids = input.assignedClassIds;
  }
  if (input.classAmounts !== undefined) body.class_amounts = input.classAmounts;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<FeeComponentDto>(
    `/api/v1/fees/components/${componentId.trim()}`,
    body,
  );
}

export async function deleteFeeComponent(
  componentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(componentId)) {
    throw new Error("component_id must be a valid UUID");
  }
  await client.delete(`/api/v1/fees/components/${componentId.trim()}`);
}

export async function upsertConcession(
  input: UpsertConcessionInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ConcessionDto> {
  assertApiMode();
  if (!isInstituteUuid(input.feePlanId)) {
    throw new Error("fee_plan_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.feeComponentId)) {
    throw new Error("fee_component_id must be a valid UUID");
  }
  return client.put<ConcessionDto>("/api/v1/fees/concessions", {
    fee_plan_id: input.feePlanId.trim(),
    student_id: input.studentId.trim(),
    fee_component_id: input.feeComponentId.trim(),
    amount: input.amount,
    note: input.note,
  });
}

export async function deleteConcession(
  concessionId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(concessionId)) {
    throw new Error("concession_id must be a valid UUID");
  }
  await client.delete(`/api/v1/fees/concessions/${concessionId.trim()}`);
}

export async function recordPayment(
  input: RecordPaymentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePaymentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.feePlanId)) {
    throw new Error("fee_plan_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  const note = input.note.trim();
  if (!note) {
    throw new Error("Payment note is required");
  }
  return client.post<FeePaymentDto>("/api/v1/fees/payments", {
    fee_plan_id: input.feePlanId.trim(),
    student_id: input.studentId.trim(),
    class_id: input.classId.trim(),
    amount: input.amount,
    method: input.method,
    paid_on: input.paidOn,
    note,
  });
}

export async function voidPayment(
  input: VoidPaymentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<FeePaymentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.paymentId)) {
    throw new Error("payment_id must be a valid UUID");
  }
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Void reason is required");
  }
  return client.post<FeePaymentDto>(
    `/api/v1/fees/payments/${input.paymentId.trim()}/void`,
    { reason },
  );
}
