import type { FeeCategoryKey, FeesSnapshot } from "@lumenx/module-fees";
import type { FeeComponentKind } from "./types";
import { createFeeComponent, updateFeeComponent } from "./mutations";
import {
  expandAmountAcrossClassIds,
  idsForClassLabel,
  type ClassIdsByLabel,
} from "./class-ids";

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
  classIdsByLabel: ClassIdsByLabel = {},
): Record<string, number> {
  const amounts: Record<string, number> = {};
  for (const [classKey, byCat] of Object.entries(snapshot.classDefaults)) {
    const amount = byCat[categoryId];
    if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
    Object.assign(
      amounts,
      expandAmountAcrossClassIds(classKey, amount, classIdsByLabel, classIdByLabel),
    );
  }
  return amounts;
}

export function resolveClassId(
  classKey: string,
  classIdByLabel: Record<string, string>,
  classIdsByLabel: ClassIdsByLabel = {},
): string {
  const ids = idsForClassLabel(classKey, classIdsByLabel, classIdByLabel);
  if (ids.length === 0) {
    throw new Error(`No class id mapped for "${classKey}"`);
  }
  return ids[0]!;
}

export function resolveClassIds(
  classKey: string,
  classIdByLabel: Record<string, string>,
  classIdsByLabel: ClassIdsByLabel = {},
): string[] {
  const ids = idsForClassLabel(classKey, classIdsByLabel, classIdByLabel);
  if (ids.length === 0) {
    throw new Error(`No class id mapped for "${classKey}"`);
  }
  return ids;
}

/** Create-or-update a core component's amount for one class label (all sibling UUIDs). */
export async function upsertCoreClassAmount(input: {
  feePlanId: string;
  snapshot: FeesSnapshot;
  classIdByLabel: Record<string, string>;
  classIdsByLabel?: ClassIdsByLabel;
  kind: Exclude<FeeComponentKind, "custom">;
  name: string;
  classKey: string;
  amount: number;
}): Promise<void> {
  const classIdsByLabel = input.classIdsByLabel ?? {};
  const siblingAmounts = expandAmountAcrossClassIds(
    input.classKey,
    input.amount,
    classIdsByLabel,
    input.classIdByLabel,
  );
  if (Object.keys(siblingAmounts).length === 0) {
    throw new Error(`No class id mapped for "${input.classKey}"`);
  }
  const existing = findCategoryByKind(input.snapshot, input.kind);
  if (!existing) {
    await createFeeComponent({
      feePlanId: input.feePlanId,
      kind: input.kind,
      name: input.name,
      active: true,
      assignedToAll: true,
      classAmounts: siblingAmounts,
    });
    return;
  }
  const classAmounts = classAmountsForCategory(
    input.snapshot,
    existing.id,
    input.classIdByLabel,
    classIdsByLabel,
  );
  Object.assign(classAmounts, siblingAmounts);
  await updateFeeComponent(existing.id, { classAmounts });
}

export async function syncTuitionBooksRow(input: {
  feePlanId: string;
  snapshot: FeesSnapshot;
  classIdByLabel: Record<string, string>;
  classIdsByLabel?: ClassIdsByLabel;
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
  classIdsByLabel?: ClassIdsByLabel;
  kind: Exclude<FeeComponentKind, "custom">;
  name: string;
  amountsByClassKey: Record<string, number>;
}): Promise<void> {
  const classIdsByLabel = input.classIdsByLabel ?? {};
  const classAmounts: Record<string, number> = {};
  for (const [classKey, amount] of Object.entries(input.amountsByClassKey)) {
    Object.assign(
      classAmounts,
      expandAmountAcrossClassIds(
        classKey,
        amount,
        classIdsByLabel,
        input.classIdByLabel,
      ),
    );
  }
  if (Object.keys(classAmounts).length === 0) {
    throw new Error("No class ids mapped for fee amounts");
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
