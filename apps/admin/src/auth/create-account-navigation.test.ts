import { describe, expect, it } from "vitest";
import {
  isNestedInteractiveTarget,
  linkCtaClassName,
} from "./create-account-navigation";
import { resolvePostSignupRoute } from "./signup-routing";

function fakeEl(tag: string, matchClosest: boolean): EventTarget {
  return {
    closest(sel: string) {
      if (!matchClosest) return null;
      if (sel.includes(tag) || sel.includes("button") || sel.includes("role='button'")) {
        return {};
      }
      return null;
    },
  } as unknown as EventTarget;
}

describe("create-account navigation", () => {
  it("treats non-elements as non-interactive targets", () => {
    expect(isNestedInteractiveTarget(null)).toBe(false);
    expect(isNestedInteractiveTarget("text" as unknown as EventTarget)).toBe(false);
  });

  it("detects nested button targets that caused first-click bounce", () => {
    expect(isNestedInteractiveTarget(fakeEl("button", true))).toBe(true);
    expect(isNestedInteractiveTarget(fakeEl("span", false))).toBe(false);
  });

  it("builds link CTA classes without nesting a button", () => {
    const primary = linkCtaClassName({ variant: "primary", fullWidth: true });
    expect(primary).toContain("bg-primary");
    expect(primary).toContain("w-full");
    const outline = linkCtaClassName({ variant: "outline", size: "sm", fullWidth: false });
    expect(outline).toContain("border");
    expect(outline).not.toContain("w-full");
  });

  it("routes post-signup to pending in API mode and OTP in demo", () => {
    expect(resolvePostSignupRoute(true)).toBe("/pending-verification");
    expect(resolvePostSignupRoute(false)).toBe("/verify-email-otp");
  });
});
