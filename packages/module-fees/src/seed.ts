import type { FeeCategoryDef, FeesSnapshot } from "./types";

export const FEES_STORAGE_KEY = "lumenx.fees.v1";

export const CORE_CATEGORY_IDS = {
  tuition: "cat-tuition",
  books: "cat-books",
  transport: "cat-transport",
} as const;

const CORE_CATEGORIES: FeeCategoryDef[] = [
  {
    id: CORE_CATEGORY_IDS.tuition,
    key: "tuition",
    name: "Tuition",
    active: true,
    assignedClassKeys: [],
    assignedToAll: true,
  },
  {
    id: CORE_CATEGORY_IDS.books,
    key: "books",
    name: "Books",
    active: true,
    assignedClassKeys: [],
    assignedToAll: true,
  },
  {
    id: CORE_CATEGORY_IDS.transport,
    key: "transport",
    name: "Transport",
    active: true,
    assignedClassKeys: [],
    assignedToAll: true,
  },
];

/** Admin school profile class levels. */
export const ADMIN_CLASS_KEYS = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;

/**
 * Connect parent children use Class N labels.
 * Seeded so published dues resolve for C1/C2/C3 without Admin republish.
 */
export const CONNECT_CLASS_KEYS = ["Class 4", "Class 7", "Class 10"] as const;

function amounts(
  tuition: number,
  books: number,
  transport: number,
): Record<string, number> {
  return {
    [CORE_CATEGORY_IDS.tuition]: tuition,
    [CORE_CATEGORY_IDS.books]: books,
    [CORE_CATEGORY_IDS.transport]: transport,
  };
}

/** Default price ladder by class level. */
const ADMIN_DEFAULTS: Record<string, Record<string, number>> = {
  "Grade 9": amounts(16_000, 2_400, 7_500),
  "Grade 10": amounts(18_000, 2_800, 8_000),
  "Grade 11": amounts(20_000, 3_200, 8_500),
  "Grade 12": amounts(22_000, 3_500, 9_000),
};

const CONNECT_DEFAULTS: Record<string, Record<string, number>> = {
  "Class 4": amounts(15_000, 1_200, 6_000),
  "Class 7": amounts(18_000, 2_000, 7_000),
  "Class 10": amounts(21_000, 2_800, 8_000),
};

/**
 * Demo concession: Aarav Sharma (Connect C1) — tuition reduced after parent discussion.
 * Other children keep Class 10 defaults.
 */
const SEED_OVERRIDES: FeesSnapshot["overrides"] = [
  {
    studentId: "C1",
    categoryId: CORE_CATEGORY_IDS.tuition,
    amount: 18_000,
    note: "Concession after parent discussion",
    updatedAt: "2026-07-01",
  },
];

/** Demo office collections (no online gateway). */
const SEED_COLLECTIONS: Record<string, number> = {
  C1: 12_000,
  C2: 20_000,
  C3: 0,
  "STU-1042": 18_000,
  "STU-1043": 5_000,
  "STU-1044": 28_800,
  "STU-1045": 30_000,
  "STU-1046": 10_000,
  "STU-1047": 31_700,
  "STU-1048": 25_900,
  "STU-1049": 15_000,
};

/** Demo offline payment receipts (kept in sync with collections above). */
const SEED_PAYMENTS: FeesSnapshot["payments"] = [
  {
    id: "pay-seed-c1-1",
    receiptNo: "RCP-2026-1001",
    studentId: "C1",
    studentName: "Aarav Sharma",
    classKey: "Class 10",
    amount: 12_000,
    method: "cash",
    note: "Term 1 tuition / books advance",
    paidAt: "2026-06-15",
    recordedAt: "2026-06-15T10:00:00.000Z",
  },
  {
    id: "pay-seed-c2-1",
    receiptNo: "RCP-2026-1002",
    studentId: "C2",
    studentName: "Anaya Sharma",
    classKey: "Class 7",
    amount: 20_000,
    method: "upi_office",
    note: "Term fees at office",
    paidAt: "2026-06-20",
    recordedAt: "2026-06-20T11:30:00.000Z",
  },
  {
    id: "pay-seed-1042-1",
    receiptNo: "RCP-2026-1010",
    studentId: "STU-1042",
    studentName: "Demo student",
    classKey: "Grade 10",
    amount: 18_000,
    method: "cheque",
    note: "Partial at reception",
    paidAt: "2026-05-28",
    recordedAt: "2026-05-28T09:00:00.000Z",
  },
];

/** Demo transport fees keyed by route stop id (from Transport routes). */
const SEED_TRANSPORT_STOP_FEES: Record<string, number> = {
  "RST-01": 9_000,
  "RST-02": 8_500,
  "RST-03": 8_000,
  "RST-04": 7_500,
  "RST-10": 8_800,
  "RST-11": 8_200,
  "RST-12": 7_800,
};

export function createSeedFeesSnapshot(): FeesSnapshot {
  return {
    version: 1,
    categories: CORE_CATEGORIES.map((c) => ({ ...c })),
    classDefaults: {
      ...structuredClone(ADMIN_DEFAULTS),
      ...structuredClone(CONNECT_DEFAULTS),
    },
    publish: {
      status: "published",
      scope: { type: "institute" },
      publishedAt: "2026-07-01T00:00:00.000Z",
    },
    overrides: SEED_OVERRIDES.map((o) => ({ ...o })),
    collections: { ...SEED_COLLECTIONS },
    payments: SEED_PAYMENTS.map((p) => ({ ...p })),
    transportStopFees: { ...SEED_TRANSPORT_STOP_FEES },
  };
}

/**
 * Order classes by level number (Class 4 → Class 10, Grade 9 → Grade 12),
 * then by prefix (Class before Grade), then alpha for leftovers (1st Year, etc.).
 */
export function compareClassKeys(a: string, b: string): number {
  const parse = (label: string) => {
    const year =
      /1st\s*year/i.test(label) ? 1 :
      /2nd\s*year/i.test(label) ? 2 :
      /3rd\s*year/i.test(label) ? 3 :
      /4th\s*year/i.test(label) ? 4 :
      null;
    const numMatch = label.match(/(\d+)/);
    const num = year ?? (numMatch ? Number(numMatch[1]) : Number.POSITIVE_INFINITY);
    const prefix = label.replace(/[\d.].*$/, "").trim().toLowerCase();
    return { num, prefix, label };
  };
  const pa = parse(a);
  const pb = parse(b);
  if (pa.num !== pb.num) return pa.num - pb.num;
  if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
  return pa.label.localeCompare(pb.label, undefined, { numeric: true });
}

export function listKnownClassKeys(snapshot: FeesSnapshot): string[] {
  return Object.keys(snapshot.classDefaults).sort(compareClassKeys);
}

export function ensureClassDefaults(
  snapshot: FeesSnapshot,
  classKeys: string[],
): FeesSnapshot {
  const next = { ...snapshot, classDefaults: { ...snapshot.classDefaults } };
  for (const key of classKeys) {
    if (next.classDefaults[key]) continue;
    // Mid-ladder defaults for newly discovered classes
    next.classDefaults[key] = amounts(17_000, 2_200, 7_500);
  }
  return next;
}
