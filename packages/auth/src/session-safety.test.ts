import { describe, expect, it } from "vitest";
import {
  asSessionRefreshOutcome,
  classifySupabaseRefreshFailure,
  createAuthSessionClock,
  isRecoverableRefreshFailure,
  shouldClearSessionOnRefreshFailure,
} from "./session-safety";

describe("createAuthSessionClock", () => {
  it("bumps generation so stale requests can be detected", () => {
    const clock = createAuthSessionClock();
    expect(clock.current()).toBe(0);
    const first = clock.bump();
    expect(first).toBe(1);
    expect(clock.current()).toBe(1);
    clock.bump();
    expect(clock.current()).toBe(2);
  });
});

describe("classifySupabaseRefreshFailure", () => {
  it("treats retryable / network errors as transient", () => {
    expect(
      classifySupabaseRefreshFailure({ name: "AuthRetryableFetchError", status: 0 }),
    ).toBe("transient");
    expect(classifySupabaseRefreshFailure({ status: 503, message: "unavailable" })).toBe(
      "transient",
    );
    expect(classifySupabaseRefreshFailure(new TypeError("Failed to fetch"))).toBe(
      "transient",
    );
  });

  it("treats confirmed dead refresh tokens as invalid", () => {
    expect(
      classifySupabaseRefreshFailure({
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token",
      }),
    ).toBe("invalid");
    expect(
      classifySupabaseRefreshFailure({
        code: "session_not_found",
        status: 403,
      }),
    ).toBe("invalid");
    expect(
      classifySupabaseRefreshFailure({
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe("invalid");
  });

  it("does not assume unknown errors are invalid", () => {
    expect(classifySupabaseRefreshFailure({ code: "unexpected_thing" })).toBe("unknown");
    expect(isRecoverableRefreshFailure({ kind: "unknown" })).toBe(true);
    expect(shouldClearSessionOnRefreshFailure({ kind: "unknown" })).toBe(false);
  });
});

describe("asSessionRefreshOutcome", () => {
  it("maps legacy booleans", () => {
    expect(asSessionRefreshOutcome(true)).toEqual({ kind: "refreshed" });
    expect(asSessionRefreshOutcome(false)).toEqual({ kind: "invalid" });
  });
});
