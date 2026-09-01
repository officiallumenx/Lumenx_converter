import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listActiveMemberUserIdsForAudience } from "../notifications/repository.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import type { FeePaymentDto, FeePlanDto } from "./types.js";

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function listParentUserIdsForStudent(
  admin: SupabaseClient,
  studentId: string,
  instituteId: string,
): Promise<string[]> {
  const links = await listLinksForStudent(admin, studentId, instituteId);
  const ids: string[] = [];
  for (const link of links) {
    const parent = await findParentById(admin, link.parent_id);
    if (parent?.user_profile_id) ids.push(parent.user_profile_id);
  }
  return [...new Set(ids)];
}

async function emitFeesNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    kind: string;
    studentId?: string;
    planId?: string;
    paymentId?: string;
  },
): Promise<void> {
  if (input.recipientUserIds.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: input.recipientUserIds,
      category: "fees",
      priority: "important",
      title: input.title,
      body: input.body,
      deepLink: "/fees",
      dedupeKey: input.dedupeKey,
      payload: {
        kind: input.kind,
        studentId: input.studentId,
        planId: input.planId,
        paymentId: input.paymentId,
      },
    });
  } catch {
    /* notification delivery must not block fees writes */
  }
}

export async function emitFeePlanPublishedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  plan: FeePlanDto,
): Promise<void> {
  const parentIds = await listActiveMemberUserIdsForAudience(
    admin,
    plan.instituteId,
    "parents",
  );
  const scopeLabel =
    plan.publishScope === "classes"
      ? `${plan.publishedClassIds.length} class(es)`
      : "institute-wide";
  await emitFeesNotification(admin, actorUserId, {
    instituteId: plan.instituteId,
    recipientUserIds: parentIds,
    title: "Fee schedule published",
    body: `Updated fee schedule (${scopeLabel}) is now visible in Connect.`,
    dedupeKey: `fee-publish:${plan.id}`,
    kind: "fee_published",
    planId: plan.id,
  });
}

export async function emitFeePaymentRecordedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  payment: FeePaymentDto,
): Promise<void> {
  const student = await findStudentById(admin, payment.studentId);
  const studentName = student?.display_name?.trim() || "Student";
  const parentIds = await listParentUserIdsForStudent(
    admin,
    payment.studentId,
    payment.instituteId,
  );

  const studentUserId = student?.user_profile_id;
  const recipients = new Set(parentIds);
  if (studentUserId) recipients.add(studentUserId);

  await emitFeesNotification(admin, actorUserId, {
    instituteId: payment.instituteId,
    recipientUserIds: [...recipients],
    title: "Payment received",
    body: `${formatInr(payment.amount)} recorded for ${studentName} · Receipt ${payment.receiptNo}`,
    dedupeKey: `fee-payment:${payment.id}`,
    kind: "payment_received",
    studentId: payment.studentId,
    planId: payment.feePlanId,
    paymentId: payment.id,
  });
}
