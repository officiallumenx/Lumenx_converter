import { describe, expect, it, vi } from "vitest";

const decideLeave = vi.fn();

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

vi.mock("./api", () => ({
  decideLeave: (...args: unknown[]) => decideLeave(...args),
  cancelLeave: vi.fn(),
  createStudentLeave: vi.fn(),
  createTeacherLeave: vi.fn(),
}));

describe("decideStudentLeave", () => {
  it("awaits the API and surfaces failures to callers (no fire-and-forget)", async () => {
    decideLeave.mockRejectedValueOnce(new Error("network down"));
    const { decideStudentLeave } = await import("./mutations");
    await expect(
      decideStudentLeave("leave-1", { outcome: "approved", note: "ok" }),
    ).rejects.toThrow("network down");
    expect(decideLeave).toHaveBeenCalledWith("leave-1", {
      outcome: "approved",
      note: "ok",
    });
  });

  it("resolves with the API result so UI can toast success only after settle", async () => {
    decideLeave.mockResolvedValueOnce({ id: "leave-1", status: "approved" });
    const { decideStudentLeave } = await import("./mutations");
    await expect(
      decideStudentLeave("leave-1", { outcome: "approved", note: "Accepted." }),
    ).resolves.toEqual({ id: "leave-1", status: "approved" });
  });
});
