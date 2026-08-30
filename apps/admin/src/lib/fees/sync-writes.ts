import type { FeeCategoryKey, FeesSnapshot } from "@lumenx/module-fees";
import type { FeeComponentKind } from "./types";
import { createFeeComponent, updateFeeComponent } from "./mutations";

export function findCategoryByKind(
  snapshot: FeesSnapshot,
  kind: Exclude<FeeCategoryKey, "custom">,
): FeesSnapshot["categories"][number] | null {
  return snapshot.categories.find((c) => c.key === kind) ?? null;
}

export function classAmountsForCategory(
  snapshot: FeesSnapshot,
  categoryId: string,
  classIdByLabel: Record<string, string>,
): Record<string, number> {
  const amounts: Record<string, number> = {};
  for (const [classKey, byCat] of Object.entries(snapshot.classDefaults)) {
    const classId = classIdByLabel[classKey];
    if (!classId) continue;
    const amount = byCat[categoryId];
    if (typeof amount === "number" && Number.isFinite(amount)) {
      amounts[classId] = amount;
    }
  }
  return amounts;
}

export function resolveClassId(
  classKey: string,
  classIdByLabel: Record<string, string>,
): string {
  const classId = classIdByLabel[classKey];
  if (!classId) {
    throw new Error(`No class id mapped for "${classKey}"`);
  }
  return classId;
}

/** Create-or-update a core component's amount for one class label. */
export async function upsertCoreClassAmount(input: {
  feePlanId: string;
  snapshot: FeesSnapshot;
  classIdByLabel: Record<string, string>;
  kind: Exclude<FeeComponentKind, "custom">;
  name: string;
  classKey: string;
  amount: number;
}): Promise<void> {
  const classId = resolveClassId(input.classKey, input.classIdByLabel);
  const existing = findCategoryByKind(input.snapshot, input.kind);
  if (!existing) {
    await createFeeComponent({
      feePlanId: input.feePlanId,
      kind: input.kind,
      name: input.name,
      active: true,
      assignedToAll: true,
      classAmounts: { [classId]: input.amount },
    });
    return;
  }
  const classAmounts = classAmountsForCategory(
    input.snapshot,
    existing.id,
    input.classIdByLabel,
  );
  classAmounts[classId] = input.amount;
  await updateFeeComponent(existing.id, { classAmounts });
}

export async function syncTuitionBooksRow(input: {
  feePlanId: string;
  snapshot: FeesSnapshot;
  classIdByLabel: Record<string, string>;
  classKey: string;
  tuition: number;
  books: number;
}): Promise<void> {
  await upsertCoreClassAmount({
    ...input,
    kind: "tuition",
    name: "Tuition",
    amount: input.tuition,
  });
  await upsertCoreClassAmount({
    ...input,
    kind: "books",
    name: "Books",
    amount: input.books,
  });
}

/** Replace all class amounts for a core kind in one create/update. */
export async function replaceCoreClassAmounts(input: {
  feePlanId: string;
  snapshot: FeesSnapshot;
  classIdByLabel: Record<string, string>;
  kind: Exclude<FeeComponentKind, "custom">;
  name: string;
  amountsByClassKey: Record<string, number>;
}): Promise<void> {
  const classAmounts: Record<string, number> = {};
  for (const [classKey, amount] of Object.entries(input.amountsByClassKey)) {
    const classId = input.classIdByLabel[classKey];
    if (!classId) {
      throw new Error(`No class id mapped for "${classKey}"`);
    }
    classAmounts[classId] = amount;
  }
  const existing = findCategoryByKind(input.snapshot, input.kind);
  if (!existing) {
    await createFeeComponent({
      feePlanId: input.feePlanId,
      kind: input.kind,
      name: input.name,
      active: true,
      assignedToAll: true,
      classAmounts,
    });
    return;
  }
  await updateFeeComponent(existing.id, { classAmounts });
}
