import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();

vi.mock("@/lib/connect-api", () => ({
  getConnectApiClient: () => ({ get }),
}));

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

describe("getStudent DTO TTL cache", () => {
  beforeEach(() => {
    get.mockReset();
    vi.resetModules();
  });

  it("reuses a fresh DTO for the same student id (Parent linked + portal)", async () => {
    const id = "55555555-5555-4555-8555-555555555555";
    get.mockResolvedValue({
      id,
      displayName: "Ada",
      classLabel: "10",
      sectionLabel: "A",
      rollNo: "1",
    });
    const { getStudent, clearStudentDtoCache } = await import("./api");
    clearStudentDtoCache();
    const a = await getStudent(id);
    const b = await getStudent(id);
    expect(a.displayName).toBe("Ada");
    expect(b.displayName).toBe("Ada");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("clears on clearStudentDtoCache so logout cannot reuse prior DTO", async () => {
    const id = "55555555-5555-4555-8555-555555555555";
    get.mockResolvedValue({ id, displayName: "Ada" });
    const { getStudent, clearStudentDtoCache } = await import("./api");
    clearStudentDtoCache();
    await getStudent(id);
    clearStudentDtoCache();
    get.mockResolvedValue({ id, displayName: "Bea" });
    const next = await getStudent(id);
    expect(next.displayName).toBe("Bea");
    expect(get).toHaveBeenCalledTimes(2);
  });
});
