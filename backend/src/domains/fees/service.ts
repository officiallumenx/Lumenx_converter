import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import {
  findActiveEnrollmentForStudentYear,
  findClassInInstituteYear,
  findComponentById,
  findConcessionById,
  findConcessionTriple,
  findFeePlanById,
  findFeePlanByInstituteYear,
  findStudentFee,
  insertComponent,
  insertConcession,
  insertFeePlan,
  insertPayment,
  listComponentsForPlan,
  listConcessionsForPlan,
  listFeePlans,
  listPaymentsForPlan,
  softDeleteComponent,
  softDeleteConcession,
  sumPaymentsForStudent,
  updateComponentFields,
  updateConcessionFields,
  updateFeePlanFields,
  upsertStudentFeeLedger,
} from "./repository.js";
import type {
  ConcessionDto,
  ConcessionRow,
  CreateFeeComponentInput,
  CreateFeePlanInput,
  FeeComponentDto,
  FeeComponentRow,
  FeeLineDto,
  FeePaymentDto,
  FeePaymentRow,
  FeePlanDto,
  FeePlanRow,
  PublishFeePlanInput,
  RecordFeePaymentInput,
  StudentFeeAccountDto,
  StudentFeeStatus,
  UpdateFeeComponentInput,
  UpsertConcessionInput,
} from "./types.js";

export const FEE_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "accountant",
] as const;

export const FEE_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

function num(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function toFeePlanDto(row: FeePlanRow): FeePlanDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    status: row.status,
    publishScope: row.publish_scope,
    publishedClassIds: row.published_class_ids ?? [],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toComponentDto(row: FeeComponentRow): FeeComponentDto {
  return {
    id: row.id,
    feePlanId: row.fee_plan_id,
    instituteId: row.institute_id,
    kind: row.kind,
    name: row.name,
    active: row.active,
    assignedToAll: row.assigned_to_all,
    assignedClassIds: row.assigned_class_ids ?? [],
    classAmounts: row.class_amounts ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toConcessionDto(row: ConcessionRow): ConcessionDto {
  return {
    id: row.id,
    feePlanId: row.fee_plan_id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    feeComponentId: row.fee_component_id,
    amount: num(row.amount),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPaymentDto(row: FeePaymentRow): FeePaymentDto {
  return {
    id: row.id,
    feePlanId: row.fee_plan_id,
    instituteId: row.institute_id,
    studentFeeId: row.student_fee_id,
    studentId: row.student_id,
    amount: num(row.amount),
    method: row.method,
    receiptNo: row.receipt_no,
    paidOn: row.paid_on,
    note: row.note,
    recordedByUserId: row.recorded_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return FEE_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertFeeWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...FEE_WRITE_ROLES]);
}

function assertFeeStaffReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
}

async function assertCanAccessStudentFees(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string,
): Promise<void> {
  assertInstituteAccess(actor, instituteId);
  if (isStaffReader(actor, instituteId)) return;

  if (actor.students.some((s) => s.studentId === studentId && s.instituteId === instituteId)) {
    return;
  }

  for (const parent of actor.parents.filter((p) => p.instituteId === instituteId)) {
    const linked = await listGuardianStudentIds(admin, parent.parentId, instituteId);
    if (linked.includes(studentId)) return;
  }

  throw AppError.forbidden("Insufficient permissions");
}

function validateClassAmounts(amounts: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(amounts)) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    ) {
      throw AppError.validation("classAmounts keys must be class UUIDs");
    }
    if (!Number.isFinite(value) || value < 0) {
      throw AppError.validation("classAmounts values must be >= 0");
    }
    out[key] = value;
  }
  return out;
}

function componentApplies(row: FeeComponentRow, classId: string): boolean {
  if (!row.active) return false;
  if (row.assigned_to_all) return true;
  return (row.assigned_class_ids ?? []).includes(classId);
}

function classInPublishScope(plan: FeePlanRow, classId: string): boolean {
  if (plan.status !== "published") return false;
  if (plan.publish_scope === "institute") return true;
  return (plan.published_class_ids ?? []).includes(classId);
}

function resolveLines(
  plan: FeePlanRow,
  components: FeeComponentRow[],
  concessions: ConcessionRow[],
  classId: string,
  requirePublished: boolean,
): FeeLineDto[] {
  if (requirePublished && !classInPublishScope(plan, classId)) return [];

  const overrideByComponent = new Map(
    concessions.map((c) => [c.fee_component_id, c]),
  );

  const lines: FeeLineDto[] = [];
  for (const component of components) {
    if (!componentApplies(component, classId)) continue;
    const defaultAmount = Number(component.class_amounts?.[classId] ?? 0);
    const ov = overrideByComponent.get(component.id);
    if (defaultAmount <= 0 && !ov) continue;
    lines.push({
      feeComponentId: component.id,
      kind: component.kind,
      name: component.name,
      defaultAmount,
      amount: ov ? num(ov.amount) : defaultAmount,
      overridden: Boolean(ov),
      note: ov?.note ?? undefined,
    });
  }
  return lines;
}

function statusFromAmounts(billed: number, paid: number): StudentFeeStatus {
  if (billed <= 0 && paid <= 0) return "due";
  if (paid >= billed) return "paid";
  if (paid > 0) return "partial";
  return "due";
}

function receiptNo(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `RCP-${y}${m}${day}-${suffix}`;
}

export async function listFeePlansForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<FeePlanDto[]> {
  assertFeeStaffReader(actor, instituteId);
  const rows = await listFeePlans(admin, instituteId);
  return rows.map(toFeePlanDto);
}

export async function getFeePlanForActor(
  admin: SupabaseClient,
  actor: Actor,
  planId: string,
): Promise<FeePlanDto> {
  const row = await findFeePlanById(admin, planId);
  if (!row) throw AppError.notFound("Fee plan not found");
  assertFeeStaffReader(actor, row.institute_id);
  return toFeePlanDto(row);
}

export async function createFeePlanForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateFeePlanInput,
): Promise<FeePlanDto> {
  assertFeeWriter(actor, input.instituteId);
  const existing = await findFeePlanByInstituteYear(
    admin,
    input.instituteId,
    input.academicYearId,
  );
  if (existing) throw AppError.conflict("Fee plan already exists for this year");
  const row = await insertFeePlan(admin, input);
  return toFeePlanDto(row);
}

export async function publishFeePlanForActor(
  admin: SupabaseClient,
  actor: Actor,
  planId: string,
  input: PublishFeePlanInput,
): Promise<FeePlanDto> {
  const existing = await findFeePlanById(admin, planId);
  if (!existing) throw AppError.notFound("Fee plan not found");
  assertFeeWriter(actor, existing.institute_id);

  const classIds =
    input.publishScope === "classes" ? (input.publishedClassIds ?? []) : [];
  if (input.publishScope === "classes" && classIds.length === 0) {
    throw AppError.validation("publishedClassIds required for class scope");
  }

  const updated = await updateFeePlanFields(admin, planId, {
    status: "published",
    publish_scope: input.publishScope,
    published_class_ids: classIds,
    published_at: new Date().toISOString(),
  });
  if (!updated) throw AppError.notFound("Fee plan not found");
  return toFeePlanDto(updated);
}

export async function unpublishFeePlanForActor(
  admin: SupabaseClient,
  actor: Actor,
  planId: string,
): Promise<FeePlanDto> {
  const existing = await findFeePlanById(admin, planId);
  if (!existing) throw AppError.notFound("Fee plan not found");
  assertFeeWriter(actor, existing.institute_id);

  const updated = await updateFeePlanFields(admin, planId, {
    status: "draft",
    publish_scope: "institute",
    published_class_ids: [],
    published_at: null,
  });
  if (!updated) throw AppError.notFound("Fee plan not found");
  return toFeePlanDto(updated);
}

export async function listComponentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  planId: string,
): Promise<FeeComponentDto[]> {
  const plan = await findFeePlanById(admin, planId);
  if (!plan) throw AppError.notFound("Fee plan not found");
  assertFeeStaffReader(actor, plan.institute_id);
  const rows = await listComponentsForPlan(admin, planId);
  return rows.map(toComponentDto);
}

export async function createComponentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateFeeComponentInput,
): Promise<FeeComponentDto> {
  const plan = await findFeePlanById(admin, input.feePlanId);
  if (!plan) throw AppError.notFound("Fee plan not found");
  assertFeeWriter(actor, plan.institute_id);

  const name = input.name.trim();
  if (!name) throw AppError.validation("name is required");

  const assignedToAll = input.assignedToAll ?? true;
  const assignedClassIds = assignedToAll ? [] : (input.assignedClassIds ?? []);
  if (!assignedToAll && assignedClassIds.length === 0) {
    throw AppError.validation("assignedClassIds required when not assignedToAll");
  }

  const row = await insertComponent(admin, {
    ...input,
    instituteId: plan.institute_id,
    name,
    assignedToAll,
    assignedClassIds,
    classAmounts: validateClassAmounts(input.classAmounts ?? {}),
  });
  return toComponentDto(row);
}

export async function updateComponentForActor(
  admin: SupabaseClient,
  actor: Actor,
  componentId: string,
  patch: UpdateFeeComponentInput,
): Promise<FeeComponentDto> {
  const existing = await findComponentById(admin, componentId);
  if (!existing) throw AppError.notFound("Fee component not found");
  assertFeeWriter(actor, existing.institute_id);

  const fields: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw AppError.validation("name cannot be empty");
    fields.name = name;
  }
  if (patch.active !== undefined) fields.active = patch.active;
  if (patch.assignedToAll !== undefined || patch.assignedClassIds !== undefined) {
    const assignedToAll = patch.assignedToAll ?? existing.assigned_to_all;
    const assignedClassIds = assignedToAll
      ? []
      : (patch.assignedClassIds ?? existing.assigned_class_ids);
    if (!assignedToAll && assignedClassIds.length === 0) {
      throw AppError.validation("assignedClassIds required when not assignedToAll");
    }
    fields.assigned_to_all = assignedToAll;
    fields.assigned_class_ids = assignedClassIds;
  }
  if (patch.classAmounts !== undefined) {
    fields.class_amounts = validateClassAmounts(patch.classAmounts);
  }

  if (Object.keys(fields).length === 0) return toComponentDto(existing);
  const updated = await updateComponentFields(admin, componentId, fields);
  if (!updated) throw AppError.notFound("Fee component not found");
  return toComponentDto(updated);
}

export async function deleteComponentForActor(
  admin: SupabaseClient,
  actor: Actor,
  componentId: string,
): Promise<void> {
  const existing = await findComponentById(admin, componentId);
  if (!existing) throw AppError.notFound("Fee component not found");
  assertFeeWriter(actor, existing.institute_id);
  if (existing.kind !== "custom") {
    throw AppError.forbidden("Only custom fee components can be deleted");
  }
  const deleted = await softDeleteComponent(admin, componentId);
  if (!deleted) throw AppError.conflict("Fee component was already deleted");
}

export async function listConcessionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  planId: string,
  studentId?: string,
): Promise<ConcessionDto[]> {
  const plan = await findFeePlanById(admin, planId);
  if (!plan) throw AppError.notFound("Fee plan not found");
  assertFeeStaffReader(actor, plan.institute_id);
  const rows = await listConcessionsForPlan(admin, planId, studentId);
  return rows.map(toConcessionDto);
}

export async function upsertConcessionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertConcessionInput,
): Promise<ConcessionDto> {
  const plan = await findFeePlanById(admin, input.feePlanId);
  if (!plan) throw AppError.notFound("Fee plan not found");
  assertFeeWriter(actor, plan.institute_id);

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== plan.institute_id) {
    throw AppError.notFound("Student not found");
  }
  const component = await findComponentById(admin, input.feeComponentId);
  if (!component || component.fee_plan_id !== plan.id) {
    throw AppError.notFound("Fee component not found");
  }
  if (input.amount < 0) throw AppError.validation("amount must be >= 0");

  const existing = await findConcessionTriple(admin, input);
  if (existing) {
    const updated = await updateConcessionFields(admin, existing.id, {
      amount: input.amount,
      note: input.note ?? null,
    });
    if (!updated) throw AppError.notFound("Concession not found");
    return toConcessionDto(updated);
  }

  const row = await insertConcession(admin, {
    ...input,
    instituteId: plan.institute_id,
  });
  return toConcessionDto(row);
}

export async function deleteConcessionForActor(
  admin: SupabaseClient,
  actor: Actor,
  concessionId: string,
): Promise<void> {
  const existing = await findConcessionById(admin, concessionId);
  if (!existing) throw AppError.notFound("Concession not found");
  assertFeeWriter(actor, existing.institute_id);
  const deleted = await softDeleteConcession(admin, concessionId);
  if (!deleted) throw AppError.conflict("Concession was already deleted");
}

export async function getStudentFeeAccountForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { planId: string; studentId: string; classId: string },
): Promise<StudentFeeAccountDto> {
  const plan = await findFeePlanById(admin, input.planId);
  if (!plan) throw AppError.notFound("Fee plan not found");

  await assertCanAccessStudentFees(
    admin,
    actor,
    plan.institute_id,
    input.studentId,
  );

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== plan.institute_id) {
    throw AppError.notFound("Student not found");
  }

  const staffReader = isStaffReader(actor, plan.institute_id);
  const enrollment = await findActiveEnrollmentForStudentYear(admin, {
    studentId: input.studentId,
    academicYearId: plan.academic_year_id,
    instituteId: plan.institute_id,
  });

  // Non-staff: mirror RLS can_learner_read_fee_student (published + class scope).
  if (!staffReader) {
    if (plan.status !== "published") {
      throw AppError.forbidden("Fee plan is not published");
    }
    if (enrollment) {
      if (enrollment.class_id !== input.classId) {
        throw AppError.validation(
          "class_id does not match the student's active enrollment",
        );
      }
      if (!classInPublishScope(plan, enrollment.class_id)) {
        throw AppError.forbidden("Fees are not published for this class");
      }
    } else if (!classInPublishScope(plan, input.classId)) {
      throw AppError.forbidden("Fees are not published for this class");
    }
  } else if (enrollment && enrollment.class_id !== input.classId) {
    // Staff may inspect other classes, but warn via validation when enrollment exists.
    // Keep staff flexible for office tooling — only learners are hard-gated.
  }

  const components = await listComponentsForPlan(admin, plan.id);
  const concessions = await listConcessionsForPlan(
    admin,
    plan.id,
    input.studentId,
  );
  const lines = resolveLines(
    plan,
    components,
    concessions,
    input.classId,
    !staffReader,
  );
  const billedAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  const paidAmount = await sumPaymentsForStudent(
    admin,
    plan.id,
    input.studentId,
  );
  const dueAmount = Math.max(0, billedAmount - paidAmount);
  const status = statusFromAmounts(billedAmount, paidAmount);
  const ledger = await findStudentFee(admin, plan.id, input.studentId);

  return {
    feePlanId: plan.id,
    studentId: input.studentId,
    classId: input.classId,
    published: classInPublishScope(plan, input.classId),
    lines,
    billedAmount,
    paidAmount,
    dueAmount,
    status,
    studentFeeId: ledger?.id ?? null,
  };
}

export async function listPaymentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  planId: string,
  studentId?: string,
): Promise<FeePaymentDto[]> {
  const plan = await findFeePlanById(admin, planId);
  if (!plan) throw AppError.notFound("Fee plan not found");
  assertFeeStaffReader(actor, plan.institute_id);
  const rows = await listPaymentsForPlan(admin, planId, studentId);
  return rows.map(toPaymentDto);
}

export async function recordPaymentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: RecordFeePaymentInput,
): Promise<FeePaymentDto> {
  const plan = await findFeePlanById(admin, input.feePlanId);
  if (!plan) throw AppError.notFound("Fee plan not found");
  assertFeeWriter(actor, plan.institute_id);

  if (input.amount <= 0) throw AppError.validation("amount must be > 0");

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== plan.institute_id) {
    throw AppError.notFound("Student not found");
  }

  const enrollment = await findActiveEnrollmentForStudentYear(admin, {
    studentId: input.studentId,
    academicYearId: plan.academic_year_id,
    instituteId: plan.institute_id,
  });
  if (enrollment) {
    if (enrollment.class_id !== input.classId) {
      throw AppError.validation(
        "class_id does not match the student's active enrollment",
      );
    }
  } else {
    const cls = await findClassInInstituteYear(admin, {
      classId: input.classId,
      instituteId: plan.institute_id,
      academicYearId: plan.academic_year_id,
    });
    if (!cls) {
      throw AppError.validation("class_id is invalid for this fee plan year");
    }
  }

  const account = await getStudentFeeAccountForActor(admin, actor, {
    planId: plan.id,
    studentId: input.studentId,
    classId: input.classId,
  });
  if (account.billedAmount <= 0) {
    throw AppError.validation("Cannot record payment when billed amount is 0");
  }

  // Ensure ledger row exists for FK, using current payment sum (not pre-incremented).
  const currentPaid = await sumPaymentsForStudent(
    admin,
    plan.id,
    input.studentId,
  );
  const ledger = await upsertStudentFeeLedger(admin, {
    instituteId: plan.institute_id,
    feePlanId: plan.id,
    studentId: input.studentId,
    billedAmount: account.billedAmount,
    paidAmount: currentPaid,
    status: statusFromAmounts(account.billedAmount, currentPaid),
  });

  const row = await insertPayment(admin, {
    instituteId: plan.institute_id,
    feePlanId: plan.id,
    studentFeeId: ledger.id,
    studentId: input.studentId,
    amount: input.amount,
    method: input.method,
    receiptNo: receiptNo(),
    paidOn: input.paidOn,
    note: input.note ?? null,
    recordedByUserId: actor.userId,
  });

  const paidAmount = await sumPaymentsForStudent(
    admin,
    plan.id,
    input.studentId,
  );
  await upsertStudentFeeLedger(admin, {
    instituteId: plan.institute_id,
    feePlanId: plan.id,
    studentId: input.studentId,
    billedAmount: account.billedAmount,
    paidAmount,
    status: statusFromAmounts(account.billedAmount, paidAmount),
  });

  return toPaymentDto(row);
}
