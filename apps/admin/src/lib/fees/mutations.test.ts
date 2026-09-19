import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PLAN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STUDENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const COMPONENT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLASS = "ffffffff-ffff-4fff-8fff-ffffffffffff";

describe("fees mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create plan without authenticated API client", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createFeePlan } = await import("./mutations");
    await expect(
      createFeePlan({ instituteId: INST, academicYearId: YEAR }),
    ).rejects.toThrow(/API auth mode|Authentication required|Demo Mode is no longer supported/);
  });

  it("does not call network for invalid student UUID on concession", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const put = vi.fn();
    const client = { put } as never;
    const { upsertConcession } = await import("./mutations");
    await expect(
      upsertConcession(
        {
          feePlanId: PLAN,
          studentId: "not-a-uuid",
          feeComponentId: COMPONENT,
          amount: 500,
        },
        client,
      ),
    ).rejects.toThrow(/UUID/);
    expect(put).not.toHaveBeenCalled();
  });

  it("puts concession payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const put = vi.fn().mockResolvedValue({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
    const client = { put } as never;
    const { upsertConcession } = await import("./mutations");
    await upsertConcession(
      {
        feePlanId: PLAN,
        studentId: STUDENT,
        feeComponentId: COMPONENT,
        amount: 250,
        note: "Sibling",
      },
      client,
    );
    expect(put).toHaveBeenCalledWith(
      "/api/v1/fees/concessions",
      expect.objectContaining({
        fee_plan_id: PLAN,
        student_id: STUDENT,
        fee_component_id: COMPONENT,
        amount: 250,
      }),
    );
  });

  it("posts payment with fee_component_id; cash note optional", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: PLAN, feeComponentId: COMPONENT });
    const client = { post } as never;
    const { recordPayment } = await import("./mutations");
    await recordPayment(
      {
        feePlanId: PLAN,
        studentId: STUDENT,
        classId: CLASS,
        feeComponentId: COMPONENT,
        amount: 1000,
        method: "cash",
        paidOn: "2026-08-29",
        note: null,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/fees/payments",
      expect.objectContaining({
        fee_plan_id: PLAN,
        class_id: CLASS,
        fee_component_id: COMPONENT,
        method: "cash",
        paid_on: "2026-08-29",
        note: null,
      }),
    );
  });

  it("requires transaction note for non-cash payment methods", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { recordPayment } = await import("./mutations");
    await expect(
      recordPayment(
        {
          feePlanId: PLAN,
          studentId: STUDENT,
          classId: CLASS,
          feeComponentId: COMPONENT,
          amount: 1000,
          method: "upi_office",
          paidOn: "2026-08-29",
          note: "   ",
        },
        client,
      ),
    ).rejects.toThrow(/Transaction ID \/ note is required/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts void payment payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const PAYMENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const post = vi.fn().mockResolvedValue({ id: PAYMENT });
    const client = { post } as never;
    const { voidPayment } = await import("./mutations");
    await voidPayment({ paymentId: PAYMENT, reason: "Duplicate entry" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/fees/payments/${PAYMENT}/void`,
      { reason: "Duplicate entry" },
    );
  });

  it("deletes concession in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const CONCESSION = "99999999-9999-4999-8999-999999999999";
    const del = vi.fn().mockResolvedValue(undefined);
    const client = { delete: del } as never;
    const { deleteConcession } = await import("./mutations");
    await deleteConcession(CONCESSION, client);
    expect(del).toHaveBeenCalledWith(`/api/v1/fees/concessions/${CONCESSION}`);
  });

  it("publishes fee plan in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: PLAN, status: "published" });
    const client = { post } as never;
    const { publishFeePlan } = await import("./mutations");
    await publishFeePlan(PLAN, { publishScope: "institute" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/fees/plans/${PLAN}/publish`,
      expect.objectContaining({ publish_scope: "institute" }),
    );
  });
});
