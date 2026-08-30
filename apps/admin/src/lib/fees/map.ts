import type { FeesSnapshot } from "@lumenx/module-fees";
import type {
  ClassLabelDto,
  ConcessionDto,
  FeeComponentDto,
  FeePaymentDto,
  FeePlanDto,
} from "./types";

export function classLabelsToMap(classes: ClassLabelDto[]): Map<string, string> {
  return new Map(classes.map((item) => [item.id, item.label]));
}

function classKeyForId(classId: string, labels: Map<string, string>): string {
  return labels.get(classId) ?? classId;
}

export function pickActiveFeePlan(plans: FeePlanDto[]): FeePlanDto | null {
  if (!Array.isArray(plans) || plans.length === 0) return null;
  const published = plans.filter((plan) => plan.status === "published");
  const pool = published.length > 0 ? published : plans;
  return [...pool].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function feeBundleToFeesSnapshot(input: {
  plan: FeePlanDto;
  components: FeeComponentDto[];
  concessions: ConcessionDto[];
  payments: FeePaymentDto[];
  classLabels: ClassLabelDto[];
}): FeesSnapshot {
  const labels = classLabelsToMap(input.classLabels);
  const classDefaults: FeesSnapshot["classDefaults"] = {};

  for (const component of input.components) {
    for (const [classId, amount] of Object.entries(component.classAmounts ?? {})) {
      const classKey = classKeyForId(classId, labels);
      if (!classDefaults[classKey]) classDefaults[classKey] = {};
      classDefaults[classKey][component.id] = amount;
    }
  }

  const categories = input.components.map((component) => ({
    id: component.id,
    key: component.kind,
    name: component.name,
    active: component.active,
    assignedToAll: component.assignedToAll,
    assignedClassKeys: component.assignedClassIds.map((id) => classKeyForId(id, labels)),
  }));

  const overrides = input.concessions.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    categoryId: row.feeComponentId,
    amount: row.amount,
    note: row.note ?? undefined,
    updatedAt: row.updatedAt,
  }));

  const payments = input.payments.map((row) => ({
    id: row.id,
    receiptNo: row.receiptNo,
    studentId: row.studentId,
    studentName: "—",
    classKey: "—",
    amount: row.amount,
    method: row.method,
    note: row.note ?? undefined,
    paidAt: row.paidOn,
    recordedAt: row.createdAt,
  }));

  const collections: FeesSnapshot["collections"] = {};
  for (const payment of payments) {
    collections[payment.studentId] = (collections[payment.studentId] ?? 0) + payment.amount;
  }

  return {
    version: 1,
    categories,
    classDefaults,
    publish: {
      status: input.plan.status,
      scope:
        input.plan.publishScope === "institute"
          ? { type: "institute" }
          : {
              type: "classes",
              classKeys: input.plan.publishedClassIds.map((id) => classKeyForId(id, labels)),
            },
      publishedAt: input.plan.publishedAt,
    },
    overrides,
    collections,
    payments,
    transportStopFees: {},
  };
}
