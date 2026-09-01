/** Fees domain types aligned to fee_plan / fee_component / student_fee / fee_payment / concession. */

export type FeePlanStatus = "draft" | "published";
export type FeePublishScope = "institute" | "classes";
export type FeeComponentKind = "tuition" | "books" | "transport" | "custom";
export type StudentFeeStatus = "paid" | "partial" | "due";
export type FeePaymentMethod =
  | "cash"
  | "cheque"
  | "upi_office"
  | "bank_transfer"
  | "other";

export type FeePlanRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  status: FeePlanStatus;
  publish_scope: FeePublishScope;
  published_class_ids: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type FeeComponentRow = {
  id: string;
  institute_id: string;
  fee_plan_id: string;
  kind: FeeComponentKind;
  name: string;
  active: boolean;
  assigned_to_all: boolean;
  assigned_class_ids: string[];
  class_amounts: Record<string, number>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StudentFeeRow = {
  id: string;
  institute_id: string;
  fee_plan_id: string;
  student_id: string;
  billed_amount: number | string;
  paid_amount: number | string;
  status: StudentFeeStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type FeePaymentRow = {
  id: string;
  institute_id: string;
  fee_plan_id: string;
  student_fee_id: string;
  student_id: string;
  amount: number | string;
  method: FeePaymentMethod;
  receipt_no: string;
  paid_on: string;
  note: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ConcessionRow = {
  id: string;
  institute_id: string;
  fee_plan_id: string;
  student_id: string;
  fee_component_id: string;
  amount: number | string;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type CreateFeePlanInput = {
  instituteId: string;
  academicYearId: string;
};

export type CreateFeeComponentInput = {
  feePlanId: string;
  kind: FeeComponentKind;
  name: string;
  active?: boolean;
  assignedToAll?: boolean;
  assignedClassIds?: string[];
  classAmounts?: Record<string, number>;
};

export type UpdateFeeComponentInput = {
  name?: string;
  active?: boolean;
  assignedToAll?: boolean;
  assignedClassIds?: string[];
  classAmounts?: Record<string, number>;
};

export type PublishFeePlanInput = {
  publishScope: FeePublishScope;
  publishedClassIds?: string[];
};

export type UpsertConcessionInput = {
  feePlanId: string;
  studentId: string;
  feeComponentId: string;
  amount: number;
  note?: string | null;
};

export type RecordFeePaymentInput = {
  feePlanId: string;
  studentId: string;
  classId: string;
  amount: number;
  method: FeePaymentMethod;
  paidOn: string;
  note?: string | null;
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
