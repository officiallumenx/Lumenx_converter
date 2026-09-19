import { describe, expect, it, vi, beforeEach } from "vitest";

describe("provisionAuthUser conflict reuse", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns existing auth user id when createUser says already registered", async () => {
    const existingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    const generateLink = vi.fn().mockResolvedValue({
      data: { user: { id: existingId } },
      error: null,
    });
    const admin = {
      auth: { admin: { createUser, generateLink } },
    } as never;

    const { provisionAuthUser } = await import("../parents/provision.js");
    const id = await provisionAuthUser(admin, "driver.9876543210.inst@transport.lumenx.internal");
    expect(id).toBe(existingId);
    expect(generateLink).toHaveBeenCalled();
  });
});
