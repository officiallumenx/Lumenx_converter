import { describe, expect, it } from "vitest";
import {
  shouldIgnoreDuplicateSignupSubmit,
  shouldReleaseSignupSubmitLockAfterSuccess,
  signupIsUnauthenticatedPublicPath,
} from "./signup-submit-guard";

describe("signup submit guard", () => {
  it("blocks a second submit while the first is pending or success-locked", () => {
    expect(shouldIgnoreDuplicateSignupSubmit(false)).toBe(false);
    expect(shouldIgnoreDuplicateSignupSubmit(true)).toBe(true);
  });

  it("keeps the API-mode success lock until unmount; demo may release after navigate", () => {
    expect(shouldReleaseSignupSubmitLockAfterSuccess(true)).toBe(false);
    expect(shouldReleaseSignupSubmitLockAfterSuccess(false)).toBe(true);
  });

  it("treats signup and welcome as unauthenticated public entry points", () => {
    expect(signupIsUnauthenticatedPublicPath("/signup")).toBe(true);
    expect(signupIsUnauthenticatedPublicPath("/welcome")).toBe(true);
    expect(signupIsUnauthenticatedPublicPath("/")).toBe(false);
  });
});
