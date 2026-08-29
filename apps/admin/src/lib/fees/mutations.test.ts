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

  it("refuses create plan in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createFeePlan } = await import("./mutations");
    await expect(
      createFeePlan({ instituteId: INST, academicYearId: YEAR }),
    ).rejects.toThrow(/API auth mode/);
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

  it("posts payment payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: PLAN });
    const client = { post } as never;
    const { recordPayment } = await import("./mutations");
    await recordPayment(
      {
        feePlanId: PLAN,
        studentId: STUDENT,
        classId: CLASS,
        amount: 1000,
        method: "cash",
        paidOn: "2026-08-29",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/fees/payments",
      expect.objectContaining({
        fee_plan_id: PLAN,
        class_id: CLASS,
        method: "cash",
        paid_on: "2026-08-29",
      }),
    );
  });
});
