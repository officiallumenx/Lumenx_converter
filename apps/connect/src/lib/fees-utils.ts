import type { FeeItem } from "@lumenx/types";

export type FeeCategory = "tuition" | "exam" | "transport" | "activity" | "other";

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  tuition: "Tuition",
  exam: "Examination",
  transport: "Transport",
  activity: "Activity & lab",
  other: "Other",
};

export const FEE_CATEGORY_ORDER: FeeCategory[] = [
  "tuition",
  "exam",
  "transport",
  "activity",
  "other",
];

type DueRow = {
  id: string;
  title: string;
  amount: number;
  due: string;
  status: FeeItem["status"];
  category?: FeeCategory;
};

export function inferFeeCategory(title: string, category?: FeeItem["category"]): FeeCategory {
  if (category === "exam") return "exam";
  const t = title.toLowerCase();
  if (t.includes("tuition")) return "tuition";
  if (t.includes("transport")) return "transport";
  if (
    t.includes("exam") ||
    t.includes("examination") ||
    t.includes("practical") ||
    t.includes("viva") ||
    t.includes("hall ticket")
  ) {
    return "exam";
  }
  if (t.includes("lab") || t.includes("activity") || t.includes("stationery")) return "activity";
  return "other";
}

export function isOutstandingStatus(status: FeeItem["status"]): boolean {
  return status !== "paid";
}

/** Amount still owed (partial instalments assume ~50% remaining). */
export function outstandingAmount(amount: number, status: FeeItem["status"]): number {
  if (status === "paid") return 0;
  if (status === "partial") return Math.round(amount * 0.5);
  return amount;
}

export type FeeCategoryBreakdown = Record<FeeCategory, number>;

export type FeeDuesSummary = {
  totalOutstanding: number;
  totalPaid: number;
  totalAnnual: number;
  byCategory: FeeCategoryBreakdown;
  overdueCount: number;
  dueSoonCount: number;
  nextDueDate: string | null;
  nextDueLabel: string | null;
};

function emptyBreakdown(): FeeCategoryBreakdown {
  return { tuition: 0, exam: 0, transport: 0, activity: 0, other: 0 };
}

function parseDueDate(due: string): number {
  const parsed = Date.parse(due.replace(/(\d+) (\w+) (\d+)/, "$2 $1, $3"));
  return Number.isNaN(parsed) ? Infinity : parsed;
}

export function summarizeFeeItems(items: FeeItem[]): FeeDuesSummary {
  const byCategory = emptyBreakdown();
  let totalOutstanding = 0;
  let totalPaid = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let nextDue: { date: string; ts: number } | null = null;

  for (const f of items) {
    const cat = inferFeeCategory(f.title, f.category);
    const owed = outstandingAmount(f.amount, f.status);
    if (owed > 0) {
      byCategory[cat] += owed;
      totalOutstanding += owed;
      if (f.status === "overdue") overdueCount += 1;
      if (f.status === "upcoming" || f.status === "partial") dueSoonCount += 1;
      const ts = parseDueDate(f.due);
      if (ts !== Infinity && (!nextDue || ts < nextDue.ts)) {
        nextDue = { date: f.due, ts };
      }
    } else {
      totalPaid += f.amount;
    }
  }

  const totalAnnual = totalOutstanding + totalPaid;

  return {
    totalOutstanding,
    totalPaid,
    totalAnnual,
    byCategory,
    overdueCount,
    dueSoonCount,
    nextDueDate: nextDue?.date ?? null,
    nextDueLabel: nextDue ? `Next due ${nextDue.date}` : null,
  };
}

export function summarizeDueRows(rows: DueRow[]): FeeDuesSummary {
  const byCategory = emptyBreakdown();
  let totalOutstanding = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let nextDue: { date: string; ts: number } | null = null;

  for (const r of rows) {
    if (!isOutstandingStatus(r.status)) continue;
    const cat = r.category ?? inferFeeCategory(r.title);
    const owed = outstandingAmount(r.amount, r.status);
    byCategory[cat] += owed;
    totalOutstanding += owed;
    if (r.status === "overdue") overdueCount += 1;
    if (r.status === "upcoming" || r.status === "partial") dueSoonCount += 1;
    const ts = parseDueDate(r.due);
    if (ts !== Infinity && (!nextDue || ts < nextDue.ts)) {
      nextDue = { date: r.due, ts };
    }
  }

  return {
    totalOutstanding,
    totalPaid: 0,
    totalAnnual: totalOutstanding,
    byCategory,
    overdueCount,
    dueSoonCount,
    nextDueDate: nextDue?.date ?? null,
    nextDueLabel: nextDue ? `Next due ${nextDue.date}` : null,
  };
}

export type ChildFeeSummary = {
  childId: string;
  childName: string;
  classLabel: string;
  totalOutstanding: number;
  byCategory: FeeCategoryBreakdown;
  overdueCount: number;
};

export function summarizeHouseholdFees(
  children: { id: string; name: string; className: string; section: string }[],
  feeDuesByChild: Record<string, DueRow[]>,
): {
  household: FeeDuesSummary;
  perChild: ChildFeeSummary[];
} {
  const allRows: DueRow[] = [];
  const perChild: ChildFeeSummary[] = [];

  for (const c of children) {
    const rows = (feeDuesByChild[c.id] ?? []).filter((r) => isOutstandingStatus(r.status));
    allRows.push(...rows);
    const summary = summarizeDueRows(rows);
    if (summary.totalOutstanding > 0 || rows.length > 0) {
      perChild.push({
        childId: c.id,
        childName: c.name,
        classLabel: `${c.className} ${c.section}`,
        totalOutstanding: summary.totalOutstanding,
        byCategory: summary.byCategory,
        overdueCount: summary.overdueCount,
      });
    }
  }

  return { household: summarizeDueRows(allRows), perChild };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function statusHint(status: FeeItem["status"], due: string): string {
  switch (status) {
    case "paid":
      return "Paid in full";
    case "overdue":
      return `Overdue — was due ${due}`;
    case "partial":
      return `Part paid — balance due by ${due}`;
    case "upcoming":
      return `Due on ${due}`;
    default:
      return `Due ${due}`;
  }
}
