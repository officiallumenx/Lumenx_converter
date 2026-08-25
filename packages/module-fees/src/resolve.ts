import type {
  FeeCategoryDef,
  FeeLineItem,
  FeesSnapshot,
  PublishScope,
  ResolveStudentInput,
} from "./types";
import { formatInr as formatInrShared } from "@lumenx/utils";

function categoryAppliesToClass(cat: FeeCategoryDef, classKey: string): boolean {
  if (!cat.active) return false;
  if (cat.assignedToAll) return true;
  return cat.assignedClassKeys.includes(classKey);
}

function classInPublishScope(classKey: string, scope: PublishScope): boolean {
  if (scope.type === "institute") return true;
  return scope.classKeys.includes(classKey);
}

export function isPublished(snapshot: FeesSnapshot): boolean {
  return snapshot.publish.status === "published";
}

export function getDefaultsForClass(
  snapshot: FeesSnapshot,
  classKey: string,
): Record<string, number> {
  return snapshot.classDefaults[classKey] ?? {};
}

/**
 * Resolve fee lines for one student.
 * - Uses published catalog only (draft → empty for parent-facing callers if requirePublished).
 * - Applies per-student overrides for that studentId only.
 */
export function resolveChildFeeLines(
  snapshot: FeesSnapshot,
  student: ResolveStudentInput,
  options?: { requirePublished?: boolean },
): FeeLineItem[] {
  const requirePublished = options?.requirePublished ?? true;
  if (requirePublished && !isPublished(snapshot)) return [];
  if (
    requirePublished &&
    !classInPublishScope(student.classKey, snapshot.publish.scope)
  ) {
    return [];
  }

  const defaults = getDefaultsForClass(snapshot, student.classKey);
  const overrideByCat = new Map(
    snapshot.overrides
      .filter((o) => o.studentId === student.studentId)
      .map((o) => [o.categoryId, o]),
  );

  const lines: FeeLineItem[] = [];
  for (const cat of snapshot.categories) {
    if (!categoryAppliesToClass(cat, student.classKey)) continue;
    const defaultAmount = defaults[cat.id] ?? 0;
    if (defaultAmount <= 0 && !overrideByCat.has(cat.id)) continue;
    const ov = overrideByCat.get(cat.id);
    lines.push({
      categoryId: cat.id,
      categoryKey: cat.key,
      name: cat.name,
      defaultAmount,
      amount: ov ? ov.amount : defaultAmount,
      overridden: Boolean(ov),
      note: ov?.note,
    });
  }
  return lines;
}

export function formatInr(amount: number): string {
  return formatInrShared(amount);
}

export type StudentFeeAccount = {
  studentId: string;
  classKey: string;
  lines: FeeLineItem[];
  billed: number;
  paid: number;
  due: number;
  status: import("./types").FeeAccountStatus;
  payments: import("./types").FeePaymentRecord[];
};

/** Paid / Due / Status + payment history for one student (offline collections). */
export function getStudentFeeAccount(
  snapshot: FeesSnapshot,
  student: ResolveStudentInput,
  options?: { requirePublished?: boolean },
): StudentFeeAccount {
  const lines = resolveChildFeeLines(snapshot, student, options);
  const billed = lines.reduce((sum, line) => sum + line.amount, 0);
  const paidRaw = Math.max(0, Math.round(snapshot.collections[student.studentId] ?? 0));
  const paid = Math.min(billed > 0 ? billed : paidRaw, paidRaw);
  const due = Math.max(0, billed - paid);
  const status: import("./types").FeeAccountStatus =
    billed <= 0 && paid <= 0
      ? "due"
      : due <= 0 && billed > 0
        ? "paid"
        : paid > 0
          ? "partial"
          : "due";
  const payments = (snapshot.payments ?? [])
    .filter((p) => p.studentId === student.studentId)
    .slice()
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || b.recordedAt.localeCompare(a.recordedAt));

  return {
    studentId: student.studentId,
    classKey: student.classKey,
    lines,
    billed,
    paid: paidRaw,
    due,
    status,
    payments,
  };
}

export type FeesOverviewTotals = {
  totalFees: number;
  paid: number;
  due: number;
  collectionRate: number;
  studentCount: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
};

/** Roll up billed / paid / due across a student roster (office collections). */
export function summarizeFeesOverview(
  snapshot: FeesSnapshot,
  students: ResolveStudentInput[],
): FeesOverviewTotals {
  let totalFees = 0;
  let paid = 0;
  let fullyPaidCount = 0;
  let partiallyPaidCount = 0;
  let unpaidCount = 0;

  for (const student of students) {
    const account = getStudentFeeAccount(snapshot, student, {
      requirePublished: false,
    });
    const collected = Math.min(account.billed, account.paid);
    totalFees += account.billed;
    paid += collected;
    if (account.billed <= 0) continue;
    if (collected <= 0) unpaidCount += 1;
    else if (collected >= account.billed) fullyPaidCount += 1;
    else partiallyPaidCount += 1;
  }

  const due = Math.max(0, totalFees - paid);
  const collectionRate = totalFees > 0 ? Math.round((paid / totalFees) * 100) : 0;

  return {
    totalFees,
    paid,
    due,
    collectionRate,
    studentCount: students.length,
    fullyPaidCount,
    partiallyPaidCount,
    unpaidCount,
  };
}
