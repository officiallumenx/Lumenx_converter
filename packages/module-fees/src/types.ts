/** Fee category kinds — core three plus custom extras. */
export type FeeCategoryKey = "tuition" | "books" | "transport" | "custom";

export type FeeCategoryDef = {
  id: string;
  key: FeeCategoryKey;
  name: string;
  active: boolean;
  /** Classes that receive this category. Empty / omitted = all classes when assignedToAll. */
  assignedClassKeys: string[];
  assignedToAll: boolean;
};

/** Amounts keyed by category id for one class level (e.g. "Grade 10" or "Class 10"). */
export type ClassFeeAmounts = Record<string, number>;

export type PublishScope =
  | { type: "institute" }
  | { type: "classes"; classKeys: string[] };

export type PublishState = {
  status: "draft" | "published";
  scope: PublishScope;
  publishedAt: string | null;
};

/** Per-student concession — visible only for that student / parent. */
export type StudentFeeOverride = {
  studentId: string;
  categoryId: string;
  amount: number;
  note?: string;
  updatedAt: string;
  /** Backend concession UUID when loaded from fees API (optional). */
  id?: string;
};

export type FeeLineItem = {
  categoryId: string;
  categoryKey: FeeCategoryKey;
  name: string;
  /** Class default before concession. */
  defaultAmount: number;
  /** Effective amount (override or default). */
  amount: number;
  overridden: boolean;
  note?: string;
};

/** Offline office payment (no gateway). */
export type FeePaymentMethod =
  | "cash"
  | "cheque"
  | "upi_office"
  | "bank_transfer"
  | "other";

export type FeePaymentRecord = {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  classKey: string;
  amount: number;
  method: FeePaymentMethod;
  note?: string;
  /** ISO date (YYYY-MM-DD) when parents paid at office. */
  paidAt: string;
  recordedAt: string;
};

export type FeeAccountStatus = "paid" | "partial" | "due";

export type FeesSnapshot = {
  version: 1;
  categories: FeeCategoryDef[];
  /** classKey → categoryId → amount */
  classDefaults: Record<string, ClassFeeAmounts>;
  publish: PublishState;
  overrides: StudentFeeOverride[];
  /** Office collections rollup — studentId → total paid (kept in sync with payments). */
  collections: Record<string, number>;
  /** Offline payment history with receipts. */
  payments: FeePaymentRecord[];
  /**
   * Transport fee by route stop id (AdminRouteStop.id from Transport).
   * Used when assigning fees per bus stop.
   */
  transportStopFees: Record<string, number>;
};

export type ResolveStudentInput = {
  studentId: string;
  classKey: string;
};
