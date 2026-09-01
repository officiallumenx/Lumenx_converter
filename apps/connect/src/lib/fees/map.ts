import type { StudentFeeAccount, FeePaymentRecord } from "@lumenx/module-fees";
import type { TeacherFeeRecord } from "@/lib/teacher/repositories";
import type {
  FeePaymentDto,
  SectionFeeRosterRowDto,
  StudentFeePortalDto,
} from "./types";

function paymentDtoToRecord(
  payment: FeePaymentDto,
  portal: Pick<StudentFeePortalDto, "studentId" | "studentName" | "className">,
): FeePaymentRecord {
  return {
    id: payment.id,
    receiptNo: payment.receiptNo,
    studentId: payment.studentId,
    studentName: portal.studentName,
    classKey: portal.className?.trim() || "—",
    amount: payment.amount,
    method: payment.method,
    note: payment.note ?? undefined,
    paidAt: payment.paidOn,
    recordedAt: payment.createdAt,
  };
}

export function portalDtoToStudentFeeAccount(portal: StudentFeePortalDto): StudentFeeAccount {
  const classKey = portal.className?.trim() || "—";
  const payments = portal.payments.map((p) => paymentDtoToRecord(p, portal));

  if (!portal.account) {
    return {
      studentId: portal.studentId,
      classKey,
      lines: [],
      billed: 0,
      paid: 0,
      due: 0,
      status: "due",
      payments,
    };
  }

  const lines = portal.account.lines.map((line) => ({
    categoryId: line.feeComponentId,
    categoryKey: line.kind,
    name: line.name,
    defaultAmount: line.defaultAmount,
    amount: line.amount,
    overridden: line.overridden,
    note: line.note,
  }));

  return {
    studentId: portal.studentId,
    classKey,
    lines,
    billed: portal.account.billedAmount,
    paid: portal.account.paidAmount,
    due: portal.account.dueAmount,
    status: portal.account.status,
    payments,
  };
}

function feeCell(due: number): { amount: number; status: "paid" | "due" | "overdue" } {
  return {
    amount: due,
    status: due <= 0 ? "paid" : "due",
  };
}

export function rosterRowToTeacherFeeRecord(row: SectionFeeRosterRowDto): TeacherFeeRecord {
  const booksAndOther = row.booksDue + row.otherDue;
  const transport =
    row.transportDue > 0 ? feeCell(row.transportDue) : undefined;

  return {
    studentId: row.studentId,
    studentName: row.studentName,
    roll: row.rollNo?.trim() || "—",
    className: row.className,
    section: row.sectionName,
    classLabel: `${row.className}-${row.sectionName}`,
    tuition: feeCell(row.tuitionDue),
    examFee: feeCell(booksAndOther),
    transport,
    totalDue: row.dueAmount,
  };
}

export function rosterRowsToTeacherFeeRecords(
  rows: SectionFeeRosterRowDto[],
): TeacherFeeRecord[] {
  return rows.map(rosterRowToTeacherFeeRecord);
}
