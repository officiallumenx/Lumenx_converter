/** Mirrors backend fees portal DTOs — keep in sync with domains/fees/types.ts. */

export type FeeComponentKind = "tuition" | "books" | "transport" | "custom";
export type StudentFeeStatus = "paid" | "partial" | "due";
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
  status: "draft" | "published";
  publishScope: "institute" | "classes";
  publishedClassIds: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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

export type StudentFeePortalDto = {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  sectionName: string | null;
  plan: FeePlanDto | null;
  account: StudentFeeAccountDto | null;
  payments: FeePaymentDto[];
};

export type SectionFeeRosterRowDto = {
  studentId: string;
  studentName: string;
  rollNo: string | null;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  billedAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: StudentFeeStatus;
  tuitionDue: number;
  booksDue: number;
  transportDue: number;
  otherDue: number;
};

export type GetStudentFeePortalParams = {
  instituteId: string;
  studentId: string;
};

export type ListSectionFeeRosterParams = {
  instituteId: string;
  sectionId: string;
};
