import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthHandoffsForTests,
  consumeAuthHandoff,
  issueAuthHandoff,
} from "../src/domains/auth-handoff/repository.js";

describe("auth handoff exchange", () => {
  beforeEach(clearAuthHandoffsForTests);

  const input = {
    app: "admissions" as const,
    accessToken: "access",
    refreshToken: "refresh",
    instituteId: "00000000-0000-4000-8000-000000000001",
    instituteName: "School",
    name: "Admin",
    destination: "institute",
  };

  it("can be consumed only once", () => {
    const { code } = issueAuthHandoff(input, 1_000, 5_000);
    expect(consumeAuthHandoff(code, "admissions", 2_000)?.accessToken).toBe("access");
    expect(consumeAuthHandoff(code, "admissions", 2_001)).toBeNull();
  });

  it("rejects expired and wrong-app codes", () => {
    const expired = issueAuthHandoff(input, 1_000, 5).code;
    expect(consumeAuthHandoff(expired, "admissions", 1_005)).toBeNull();

    const wrongApp = issueAuthHandoff(input, 1_000, 5_000).code;
    expect(consumeAuthHandoff(wrongApp, "careers", 2_000)).toBeNull();
    expect(consumeAuthHandoff(wrongApp, "admissions", 2_001)).toBeNull();
  });
});
