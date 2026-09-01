import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { requireInstituteId } from "../../authorization/index.js";
import { listEnrollments } from "../academics/repository.js";
import { findStudentById } from "../students/repository.js";
import {
  findFeePlanByInstituteYear,
  findPrimaryActiveEnrollment,
  listComponentsForPlan,
  listConcessionsForPlan,
  listPaymentsForPlan,
  sumPaymentsForStudent,
} from "./repository.js";
import {
  assertCanAccessStudentFees,
  classInPublishScope,
  getStudentFeeAccountForActor,
  isStaffReader,
  resolveLines,
  toFeePlanDto,
  toPaymentDto,
} from "./service.js";
import type {
  SectionFeeRosterRowDto,
  StudentFeePortalDto,
} from "./types.js";

async function loadClassSectionLabels(
  admin: SupabaseClient,
  classId: string,
  sectionId: string,
): Promise<{ className: string; sectionName: string }> {
  const [classRes, sectionRes] = await Promise.all([
    admin
      .from("class")
      .select("name, code")
      .eq("id", classId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("section")
      .select("name, code")
      .eq("id", sectionId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  const cls = classRes.data as { name: string | null; code: string | null } | null;
  const sec = sectionRes.data as { name: string | null; code: string | null } | null;
  return {
    className: cls?.name?.trim() || cls?.code?.trim() || "Class",
    sectionName: sec?.name?.trim() || sec?.code?.trim() || "—",
  };
}

function dueByKind(
  lines: ReturnType<typeof resolveLines>,
  paidAmount: number,
  billedAmount: number,
): { tuition: number; books: number; transport: number; other: number } {
  const buckets = { tuition: 0, books: 0, transport: 0, other: 0 };
  const dueTotal = Math.max(0, billedAmount - paidAmount);
  if (dueTotal <= 0 || billedAmount <= 0) return buckets;

  for (const line of lines) {
    const share = Math.round((line.amount / billedAmount) * dueTotal);
    if (line.kind === "tuition") buckets.tuition += share;
    else if (line.kind === "books") buckets.books += share;
    else if (line.kind === "transport") buckets.transport += share;
    else buckets.other += share;
  }
  return buckets;
}

export async function getStudentFeePortalForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string },
): Promise<StudentFeePortalDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  await assertCanAccessStudentFees(admin, actor, instituteId, input.studentId);
  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const studentName = student.display_name?.trim() || "Student";
  const enrollment = await findPrimaryActiveEnrollment(admin, {
    studentId: input.studentId,
    instituteId,
  });

  if (!enrollment) {
    return {
      studentId: input.studentId,
      studentName,
      classId: null,
      className: student.class_label,
      sectionName: student.section_label,
      plan: null,
      account: null,
      payments: [],
    };
  }

  const labels = await loadClassSectionLabels(
    admin,
    enrollment.class_id,
    enrollment.section_id,
  );

  const planRow = await findFeePlanByInstituteYear(
    admin,
    instituteId,
    enrollment.academic_year_id,
  );

  if (!planRow || planRow.status !== "published") {
    return {
      studentId: input.studentId,
      studentName,
      classId: enrollment.class_id,
      className: labels.className,
      sectionName: labels.sectionName,
      plan: null,
      account: null,
      payments: [],
    };
  }

  if (!classInPublishScope(planRow, enrollment.class_id)) {
    return {
      studentId: input.studentId,
      studentName,
      classId: enrollment.class_id,
      className: labels.className,
      sectionName: labels.sectionName,
      plan: toFeePlanDto(planRow),
      account: null,
      payments: [],
    };
  }

  const account = await getStudentFeeAccountForActor(admin, actor, {
    planId: planRow.id,
    studentId: input.studentId,
    classId: enrollment.class_id,
  });

  const paymentRows = await listPaymentsForPlan(
    admin,
    planRow.id,
    input.studentId,
  );

  return {
    studentId: input.studentId,
    studentName,
    classId: enrollment.class_id,
    className: labels.className,
    sectionName: labels.sectionName,
    plan: toFeePlanDto(planRow),
    account,
    payments: paymentRows.map(toPaymentDto),
  };
}

export async function listSectionFeeRosterForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; sectionId: string },
): Promise<SectionFeeRosterRowDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const enrollments = await listEnrollments(admin, {
    instituteId,
    sectionId: input.sectionId,
    status: "active",
  });
  if (enrollments.length === 0) return [];

  const academicYearId = enrollments[0]!.academic_year_id;
  const planRow = await findFeePlanByInstituteYear(
    admin,
    instituteId,
    academicYearId,
  );
  const components =
    planRow && planRow.status === "published"
      ? await listComponentsForPlan(admin, planRow.id)
      : [];

  const sectionRes = await admin
    .from("section")
    .select("name, code, class_id")
    .eq("id", input.sectionId)
    .maybeSingle();
  const section = sectionRes.data as {
    name: string | null;
    code: string | null;
    class_id: string;
  } | null;
  const classRes = section
    ? await admin
        .from("class")
        .select("name, code")
        .eq("id", section.class_id)
        .maybeSingle()
    : { data: null };
  const cls = classRes.data as { name: string | null; code: string | null } | null;
  const className = cls?.name?.trim() || cls?.code?.trim() || "Class";
  const sectionName = section?.name?.trim() || section?.code?.trim() || "—";

  const rows: SectionFeeRosterRowDto[] = [];
  for (const enr of enrollments) {
    const student = await findStudentById(admin, enr.student_id);
    const studentName = student?.display_name?.trim() || "Student";

    if (!planRow || planRow.status !== "published") {
      rows.push({
        studentId: enr.student_id,
        studentName,
        rollNo: enr.roll_no,
        classId: enr.class_id,
        className,
        sectionId: enr.section_id,
        sectionName,
        billedAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: "due",
        tuitionDue: 0,
        booksDue: 0,
        transportDue: 0,
        otherDue: 0,
      });
      continue;
    }

    if (!classInPublishScope(planRow, enr.class_id)) {
      continue;
    }

    const concessions = await listConcessionsForPlan(
      admin,
      planRow.id,
      enr.student_id,
    );
    const lines = resolveLines(
      planRow,
      components,
      concessions,
      enr.class_id,
      false,
    );
    const billedAmount = lines.reduce((sum, l) => sum + l.amount, 0);
    const paidAmount = await sumPaymentsForStudent(
      admin,
      planRow.id,
      enr.student_id,
    );
    const dueAmount = Math.max(0, billedAmount - paidAmount);
    const status =
      billedAmount <= 0 && paidAmount <= 0
        ? "due"
        : paidAmount >= billedAmount
          ? "paid"
          : paidAmount > 0
            ? "partial"
            : "due";
    const buckets = dueByKind(lines, paidAmount, billedAmount);

    rows.push({
      studentId: enr.student_id,
      studentName,
      rollNo: enr.roll_no,
      classId: enr.class_id,
      className,
      sectionId: enr.section_id,
      sectionName,
      billedAmount,
      paidAmount,
      dueAmount,
      status,
      tuitionDue: buckets.tuition,
      booksDue: buckets.books,
      transportDue: buckets.transport,
      otherDue: buckets.other,
    });
  }

  return rows;
}
