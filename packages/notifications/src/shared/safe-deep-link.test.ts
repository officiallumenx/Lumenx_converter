import { describe, expect, it } from "vitest";
import {
  isSafeAppDeepLink,
  normalizeSafeAppDeepLink,
  openSafeAppDeepLink,
} from "./safe-deep-link";

describe("safe-deep-link", () => {
  it("accepts in-app relative paths", () => {
    expect(isSafeAppDeepLink("/notifications")).toBe(true);
    expect(isSafeAppDeepLink("/fees?tab=due")).toBe(true);
  });

  it("rejects absolute and protocol URLs", () => {
    expect(isSafeAppDeepLink("https://evil.com")).toBe(false);
    expect(isSafeAppDeepLink("//evil.com/phish")).toBe(false);
    expect(isSafeAppDeepLink("javascript:alert(1)")).toBe(false);
  });

  it("normalizes unsafe values to fallback", () => {
    expect(normalizeSafeAppDeepLink("https://evil.com", "/notifications")).toBe(
      "/notifications",
    );
    expect(normalizeSafeAppDeepLink("/ok", null)).toBe("/ok");
  });

  it("openSafeAppDeepLink only navigates safe paths", () => {
    const calls: string[] = [];
    expect(openSafeAppDeepLink("https://evil.com", (p) => calls.push(p))).toBe(false);
    expect(calls).toEqual([]);
    expect(openSafeAppDeepLink("/inbox", (p) => calls.push(p))).toBe(true);
    expect(calls).toEqual(["/inbox"]);
  });
});
