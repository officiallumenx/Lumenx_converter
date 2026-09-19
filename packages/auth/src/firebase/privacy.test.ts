/**
 * Privacy helpers for Firebase Analytics / Crashlytics — no business PII.
 */

import { describe, it, expect } from "vitest";
import { sanitizeAnalyticsParams, scrubCrashMessage } from "./privacy";

describe("sanitizeAnalyticsParams", () => {
  it("keeps allowlisted non-sensitive params", () => {
    expect(
      sanitizeAnalyticsParams({ method: "email", platform: "web", surface: "admin" }),
    ).toEqual({ method: "email", platform: "web", surface: "admin" });
  });

  it("drops emails, phones, tokens, and UUIDs", () => {
    expect(
      sanitizeAnalyticsParams({
        method: "email",
        email: "a@b.com",
        phone: "+919876543210",
        note: "user a@b.com",
        id: "11111111-1111-4111-8111-111111111111",
        jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb",
      }),
    ).toEqual({ method: "email" });
  });
});

describe("scrubCrashMessage", () => {
  it("redacts emails, phones, bearer tokens, and UUIDs", () => {
    const scrubbed = scrubCrashMessage(
      "fail for a@b.com Bearer abc.def.ghi +919876543210 id 11111111-1111-4111-8111-111111111111",
    );
    expect(scrubbed).not.toContain("a@b.com");
    expect(scrubbed).not.toContain("9876543210");
    expect(scrubbed).not.toContain("11111111-1111");
    expect(scrubbed).toContain("[redacted]");
  });
});
