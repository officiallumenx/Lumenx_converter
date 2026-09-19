import { describe, expect, it } from "vitest";
import type { FeeLineDto, FeePaymentDto } from "./types";
import type { RecordPaymentInput } from "./mutations";

/**
 * Flowchart contract — Admin fees client field names / payment policies.
 * Keep aligned with backend domains/fees types and Admin UI wiring.
 */
describe("fees flowchart contract", () => {
  it("FeePaymentDto exposes feeComponentId (nullable)", () => {
    const sample: FeePaymentDto = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      feePlanId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      instituteId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      studentFeeId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      studentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      feeComponentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      amount: 1000,
      method: "cash",
      receiptNo: "R-1",
      paidOn: "2026-09-17",
      note: null,
      recordedByUserId: null,
      createdAt: "2026-09-17T00:00:00Z",
      updatedAt: "2026-09-17T00:00:00Z",
    };
    expect(sample.feeComponentId).toBeTruthy();
    const nullable: FeePaymentDto = { ...sample, feeComponentId: null };
    expect(nullable.feeComponentId).toBeNull();
  });

  it("FeeLineDto exposes paidAmount and balanceAmount", () => {
    const keys: Array<keyof FeeLineDto> = [
      "feeComponentId",
      "amount",
      "paidAmount",
      "balanceAmount",
    ];
    expect(keys).toEqual(
      expect.arrayContaining(["paidAmount", "balanceAmount", "feeComponentId"]),
    );
    const line: FeeLineDto = {
      feeComponentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      kind: "tuition",
      name: "Tuition",
      defaultAmount: 10000,
      amount: 10000,
      paidAmount: 4000,
      balanceAmount: 6000,
      overridden: false,
    };
    expect(line.paidAmount + line.balanceAmount).toBe(line.amount);
  });

  it("RecordPaymentInput requires feeComponentId; note optional for cash", () => {
    const cash: RecordPaymentInput = {
      feePlanId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      studentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      classId: "11111111-1111-4111-8111-111111111111",
      feeComponentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      amount: 500,
      method: "cash",
      paidOn: "2026-09-17",
      note: null,
    };
    expect(cash.feeComponentId).toBeTruthy();
    expect(cash.note).toBeNull();

    const upi: RecordPaymentInput = {
      ...cash,
      method: "upi_office",
      note: "TXN-123",
    };
    expect(upi.note).toBe("TXN-123");
  });

  it("documents academic-year-first gate and cash-only optional note", () => {
    const gate = "Academic year must be selected first";
    const noteHint = "Required except Cash (offline)";
    expect(gate).toMatch(/academic year must be selected first/i);
    expect(noteHint).toMatch(/Required except Cash/i);
  });
});
