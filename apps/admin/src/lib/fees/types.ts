/** Mirrors backend fees DTOs — keep in sync with domains/fees/types.ts. */

export type FeePlanStatus = "draft" | "published";
export type FeePublishScope = "institute" | "classes";
export type FeeComponentKind = "tuition" | "books" | "transport" | "custom";
export type FeePaymentMethod =
  | "cash"
  | "cheque"
  | "upi_office"
  | "bank_transfer"
  | "other";

export type FeePlanDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  status: FeePlanStatus;
  publishScope: FeePublishScope;
  publishedClassIds: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeeComponentDto = {
  id: string;
  feePlanId: string;
  instituteId: string;
  kind: FeeComponentKind;
  name: string;
  active: boolean;
  assignedToAll: boolean;
  assignedClassIds: string[];
  classAmounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type ConcessionDto = {
  id: string;
  feePlanId: string;
  instituteId: string;
  studentId: string;
  feeComponentId: string;
  amount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeePaymentDto = {
  id: string;
  feePlanId: string;
  instituteId: string;
  studentFeeId: string;
  studentId: string;
  amount: number;
  method: FeePaymentMethod;
  receiptNo: string;
  paidOn: string;
  note: string | null;
  recordedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListFeePlansParams = {
  instituteId: string;
};

export type ListFeeComponentsParams = {
  planId: string;
};

export type ListFeeConcessionsParams = {
  planId: string;
  studentId?: string;
};

export type ListFeePaymentsParams = {
  planId: string;
  studentId?: string;
};

export type ClassLabelDto = {
  id: string;
  label: string;
};

export type StudentFeeStatus = "due" | "partial" | "paid";

export type FeeLineDto = {
  feeComponentId: string;
  kind: FeeComponentKind;
  name: string;
  defaultAmount: number;
  amount: number;
  overridden: boolean;
  note?: string;
};

export type StudentFeeAccountDto = {
  feePlanId: string;
  studentId: string;
  classId: string;
  published: boolean;
  lines: FeeLineDto[];
  billedAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: StudentFeeStatus;
  studentFeeId: string | null;
};

export type GetStudentFeeAccountParams = {
  planId: string;
  studentId: string;
  classId: string;
};
