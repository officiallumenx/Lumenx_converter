import { describe, expect, it } from "vitest";
import { portalDtoToStudentFeeAccount, rosterRowToTeacherFeeRecord } from "./map";
import type { SectionFeeRosterRowDto, StudentFeePortalDto } from "./types";

describe("connect fees map", () => {
  it("maps portal dto to student fee account with lines and payments", () => {
    const portal: StudentFeePortalDto = {
      studentId: "ac111111-1111-4111-8111-111111111111",
      studentName: "Aarav Sharma",
      classId: "cd111111-1111-4111-8111-111111111111",
      className: "10",
      sectionName: "A",
      plan: null,
      account: {
        feePlanId: "ee111111-1111-4111-8111-111111111111",
        studentId: "ac111111-1111-4111-8111-111111111111",
        classId: "cd111111-1111-4111-8111-111111111111",
        published: true,
        lines: [
          {
            feeComponentId: "ef111111-1111-4111-8111-111111111111",
            kind: "tuition",
            name: "Tuition",
            defaultAmount: 10000,
            amount: 8000,
            overridden: true,
            note: "Sibling discount",
          },
        ],
        billedAmount: 8000,
        paidAmount: 4000,
        dueAmount: 4000,
        status: "partial",
        studentFeeId: "sf-1",
      },
      payments: [
        {
          id: "pay-1",
          feePlanId: "ee111111-1111-4111-8111-111111111111",
          instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          studentFeeId: "sf-1",
          studentId: "ac111111-1111-4111-8111-111111111111",
          amount: 4000,
          method: "cash",
          receiptNo: "RCP-20260801-ABC",
          paidOn: "2026-08-01",
          note: null,
          recordedByUserId: null,
          createdAt: "2026-08-01T10:00:00.000Z",
          updatedAt: "2026-08-01T10:00:00.000Z",
        },
      ],
    };

    const account = portalDtoToStudentFeeAccount(portal);
    expect(account.billed).toBe(8000);
    expect(account.paid).toBe(4000);
    expect(account.due).toBe(4000);
    expect(account.status).toBe("partial");
    expect(account.lines[0]?.overridden).toBe(true);
    expect(account.payments[0]?.receiptNo).toBe("RCP-20260801-ABC");
    expect(account.payments[0]?.studentName).toBe("Aarav Sharma");
  });

  it("maps roster row to teacher fee record with due buckets", () => {
    const row: SectionFeeRosterRowDto = {
      studentId: "ac111111-1111-4111-8111-111111111111",
      studentName: "Kid",
      rollNo: "12",
      classId: "cd111111-1111-4111-8111-111111111111",
      className: "10",
      sectionId: "se111111-1111-4111-8111-111111111111",
      sectionName: "A",
      billedAmount: 10000,
      paidAmount: 2000,
      dueAmount: 8000,
      status: "partial",
      tuitionDue: 5000,
      booksDue: 2000,
      transportDue: 1000,
      otherDue: 0,
    };

    const record = rosterRowToTeacherFeeRecord(row);
    expect(record.studentName).toBe("Kid");
    expect(record.tuition.status).toBe("due");
    expect(record.tuition.amount).toBe(5000);
    expect(record.examFee.amount).toBe(2000);
    expect(record.transport?.amount).toBe(1000);
    expect(record.totalDue).toBe(8000);
  });
});
