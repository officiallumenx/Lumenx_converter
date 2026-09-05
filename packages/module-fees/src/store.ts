import { createSeedFeesSnapshot, ensureClassDefaults, FEES_STORAGE_KEY } from "./seed";
import { FEES_UPDATED_EVENT } from "./subscribe";
import type {
  FeeCategoryDef,
  FeePaymentMethod,
  FeePaymentRecord,
  FeesSnapshot,
  PublishScope,
  StudentFeeOverride,
} from "./types";

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function normalizeSnapshot(parsed: FeesSnapshot): FeesSnapshot {
  const seed = createSeedFeesSnapshot();
  const payments = Array.isArray(parsed.payments) ? parsed.payments : [];
  const collectionsFromPayments: Record<string, number> = {};
  for (const p of payments) {
    collectionsFromPayments[p.studentId] =
      (collectionsFromPayments[p.studentId] ?? 0) + Math.max(0, Math.round(p.amount));
  }
  const collections = { ...(parsed.collections ?? seed.collections) };
  // Prefer summed payments when that student has payment rows.
  for (const studentId of Object.keys(collectionsFromPayments)) {
    collections[studentId] = collectionsFromPayments[studentId]!;
  }

  return {
    ...parsed,
    categories: parsed.categories ?? [],
    classDefaults: parsed.classDefaults ?? {},
    publish: parsed.publish ?? seed.publish,
    overrides: parsed.overrides ?? [],
    collections,
    payments,
    transportStopFees: parsed.transportStopFees ?? seed.transportStopFees,
  };
}

export function loadFeesSnapshot(): FeesSnapshot {
  if (!canUseStorage()) return createSeedFeesSnapshot();
  try {
    const raw = localStorage.getItem(FEES_STORAGE_KEY);
    if (!raw) return createSeedFeesSnapshot();
    const parsed = JSON.parse(raw) as FeesSnapshot;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.categories)) {
      return createSeedFeesSnapshot();
    }
    return normalizeSnapshot(parsed);
  } catch {
    return createSeedFeesSnapshot();
  }
}

export function saveFeesSnapshot(snapshot: FeesSnapshot): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(FEES_STORAGE_KEY, JSON.stringify(snapshot));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(FEES_UPDATED_EVENT));
    }
  } catch {
    // Ignore quota / private mode.
  }
}

export function resetFeesSnapshot(): FeesSnapshot {
  const seed = createSeedFeesSnapshot();
  saveFeesSnapshot(seed);
  return seed;
}

function nextReceiptNo(snapshot: FeesSnapshot): string {
  const year = new Date().getFullYear();
  const seq = (snapshot.payments?.length ?? 0) + 1001;
  return `RCP-${year}-${seq}`;
}

/**
 * Record an offline office payment. Updates Paid / Due / Status via collections
 * and appends a downloadable/printable receipt to payment history.
 */
export function recordOfficePayment(
  snapshot: FeesSnapshot,
  input: {
    studentId: string;
    studentName: string;
    classKey: string;
    amount: number;
    method?: FeePaymentMethod;
    note: string;
    paidAt?: string;
  },
): { snapshot: FeesSnapshot; payment: FeePaymentRecord } {
  const amount = Math.max(0, Math.round(input.amount));
  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  const note = input.note.trim();
  if (!note) {
    throw new Error("Payment note is required");
  }

  const paidAt = input.paidAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : [];
  const payment: FeePaymentRecord = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    receiptNo: nextReceiptNo({ ...snapshot, payments }),
    studentId: input.studentId,
    studentName: input.studentName.trim() || input.studentId,
    classKey: input.classKey,
    amount,
    method: input.method ?? "cash",
    note,
    paidAt,
    recordedAt: new Date().toISOString(),
  };

  const nextPayments = [payment, ...payments];
  const prevPaid = snapshot.collections[input.studentId] ?? 0;
  const collections = {
    ...snapshot.collections,
    [input.studentId]: prevPaid + amount,
  };

  const next: FeesSnapshot = { ...snapshot, payments: nextPayments, collections };
  saveFeesSnapshot(next);
  return { snapshot: next, payment };
}

/**
 * Void (reverse) an office payment. Recalculates Paid / Due via collections.
 */
export function voidOfficePayment(
  snapshot: FeesSnapshot,
  paymentId: string,
): { snapshot: FeesSnapshot; payment: FeePaymentRecord } {
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : [];
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) {
    throw new Error("Payment not found");
  }
  const nextPayments = payments.filter((p) => p.id !== paymentId);
  const prevPaid = snapshot.collections[payment.studentId] ?? 0;
  const collections = {
    ...snapshot.collections,
    [payment.studentId]: Math.max(0, prevPaid - Math.round(payment.amount)),
  };
  const next: FeesSnapshot = { ...snapshot, payments: nextPayments, collections };
  saveFeesSnapshot(next);
  return { snapshot: next, payment };
}

export function setClassDefaultAmount(
  snapshot: FeesSnapshot,
  classKey: string,
  categoryId: string,
  amount: number,
): FeesSnapshot {
  const safe = Math.max(0, Math.round(amount));
  const classDefaults = {
    ...snapshot.classDefaults,
    [classKey]: {
      ...(snapshot.classDefaults[classKey] ?? {}),
      [categoryId]: safe,
    },
  };
  const next = { ...snapshot, classDefaults };
  saveFeesSnapshot(next);
  return next;
}

export function upsertCustomCategory(
  snapshot: FeesSnapshot,
  input: {
    id?: string;
    name: string;
    assignedToAll: boolean;
    assignedClassKeys: string[];
    amountsByClass: Record<string, number>;
  },
): FeesSnapshot {
  const id = input.id ?? `cat-custom-${Date.now()}`;
  const existing = snapshot.categories.find((c) => c.id === id);
  const def: FeeCategoryDef = {
    id,
    key: "custom",
    name: input.name.trim() || "Extra fee",
    active: true,
    assignedToAll: input.assignedToAll,
    assignedClassKeys: input.assignedToAll ? [] : [...input.assignedClassKeys],
  };

  const categories = existing
    ? snapshot.categories.map((c) => (c.id === id ? def : c))
    : [...snapshot.categories, def];

  let classDefaults = { ...snapshot.classDefaults };
  for (const [classKey, amount] of Object.entries(input.amountsByClass)) {
    classDefaults = {
      ...classDefaults,
      [classKey]: {
        ...(classDefaults[classKey] ?? {}),
        [id]: Math.max(0, Math.round(amount)),
      },
    };
  }

  const next = { ...snapshot, categories, classDefaults };
  saveFeesSnapshot(next);
  return next;
}

export function removeCategory(snapshot: FeesSnapshot, categoryId: string): FeesSnapshot {
  const cat = snapshot.categories.find((c) => c.id === categoryId);
  if (!cat || cat.key !== "custom") return snapshot;
  const categories = snapshot.categories.filter((c) => c.id !== categoryId);
  const classDefaults: FeesSnapshot["classDefaults"] = {};
  for (const [ck, amounts] of Object.entries(snapshot.classDefaults)) {
    const { [categoryId]: _, ...rest } = amounts;
    classDefaults[ck] = rest;
  }
  const overrides = snapshot.overrides.filter((o) => o.categoryId !== categoryId);
  const next = { ...snapshot, categories, classDefaults, overrides };
  saveFeesSnapshot(next);
  return next;
}

export function publishFees(snapshot: FeesSnapshot, scope: PublishScope): FeesSnapshot {
  const next: FeesSnapshot = {
    ...snapshot,
    publish: {
      status: "published",
      scope,
      publishedAt: new Date().toISOString(),
    },
  };
  saveFeesSnapshot(next);
  return next;
}

export function unpublishFees(snapshot: FeesSnapshot): FeesSnapshot {
  const next: FeesSnapshot = {
    ...snapshot,
    publish: {
      ...snapshot.publish,
      status: "draft",
      publishedAt: null,
    },
  };
  saveFeesSnapshot(next);
  return next;
}

export function setStudentOverride(
  snapshot: FeesSnapshot,
  input: {
    studentId: string;
    categoryId: string;
    amount: number;
    note?: string;
  },
): FeesSnapshot {
  const amount = Math.max(0, Math.round(input.amount));
  const rest = snapshot.overrides.filter(
    (o) => !(o.studentId === input.studentId && o.categoryId === input.categoryId),
  );
  const row: StudentFeeOverride = {
    studentId: input.studentId,
    categoryId: input.categoryId,
    amount,
    note: input.note?.trim() || undefined,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  const next = { ...snapshot, overrides: [...rest, row] };
  saveFeesSnapshot(next);
  return next;
}

export function clearStudentOverride(
  snapshot: FeesSnapshot,
  studentId: string,
  categoryId: string,
): FeesSnapshot {
  const next = {
    ...snapshot,
    overrides: snapshot.overrides.filter(
      (o) => !(o.studentId === studentId && o.categoryId === categoryId),
    ),
  };
  saveFeesSnapshot(next);
  return next;
}

export function setTransportStopFee(
  snapshot: FeesSnapshot,
  stopId: string,
  amount: number,
): FeesSnapshot {
  const safe = Math.max(0, Math.round(amount));
  const next = {
    ...snapshot,
    transportStopFees: {
      ...(snapshot.transportStopFees ?? {}),
      [stopId]: safe,
    },
  };
  saveFeesSnapshot(next);
  return next;
}

export function setTransportStopFeesBatch(
  snapshot: FeesSnapshot,
  amountsByStopId: Record<string, number>,
): FeesSnapshot {
  const transportStopFees = { ...(snapshot.transportStopFees ?? {}) };
  for (const [stopId, amount] of Object.entries(amountsByStopId)) {
    transportStopFees[stopId] = Math.max(0, Math.round(amount));
  }
  const next = { ...snapshot, transportStopFees };
  saveFeesSnapshot(next);
  return next;
}

export function syncClassKeysFromDirectory(
  snapshot: FeesSnapshot,
  classKeys: string[],
): FeesSnapshot {
  const next = ensureClassDefaults(snapshot, classKeys);
  if (next === snapshot) return snapshot;
  saveFeesSnapshot(next);
  return next;
}
