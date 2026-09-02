import { describe, expect, it } from "vitest";
import {
  normalizeParentPhoneDigits,
  parentPortalAuthEmail,
} from "../src/domains/parents/portal-auth-email.js";

describe("parent portal auth email", () => {
  it("builds deterministic email from phone and institute", () => {
    const instituteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(parentPortalAuthEmail("9876512345", instituteId)).toBe(
      "parent.9876512345.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@portal.lumenx.internal",
    );
  });

  it("normalizes phone digits", () => {
    expect(normalizeParentPhoneDigits("+91 98765 12345")).toBe("919876512345");
  });
});
