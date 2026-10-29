import { describe, expect, it, vi } from "vitest";

/**
 * Documents the LeaveRequestCard contract: callers must return a rejecting
 * promise so the card can toast error and never toast success.
 */
describe("leave decide failure UX contract", () => {
  it("surfaces API rejection to the awaiting UI handler", async () => {
    const decideStudentLeave = vi.fn(
      async (_id: string, _input: { outcome: string; note: string }) => {
        throw new Error("Leave request already has a decision");
      },
    );

    let success = false;
    let errorMessage: string | null = null;
    try {
      await decideStudentLeave("leave-1", { outcome: "approved", note: "ok" });
      success = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    expect(success).toBe(false);
    expect(errorMessage).toMatch(/already has a decision/i);
  });
});
