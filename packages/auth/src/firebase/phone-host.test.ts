import { describe, expect, it, vi, afterEach } from "vitest";
import {
  isFirebasePhoneAuthBlockedHost,
  toFirebasePhoneAuthLoopbackUrl,
  ensureFirebasePhoneAuthHost,
  assertFirebasePhoneAuthHostAllowed,
} from "./phone-host";
import { FirebaseClientAuthError } from "./errors";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Firebase phone auth host policy", () => {
  it("blocks localhost and [::1]", () => {
    expect(isFirebasePhoneAuthBlockedHost("localhost")).toBe(true);
    expect(isFirebasePhoneAuthBlockedHost("LOCALHOST")).toBe(true);
    expect(isFirebasePhoneAuthBlockedHost("[::1]")).toBe(true);
    expect(isFirebasePhoneAuthBlockedHost("127.0.0.1")).toBe(false);
    expect(isFirebasePhoneAuthBlockedHost("app.lumenx.com")).toBe(false);
  });

  it("rewrites hostname to 127.0.0.1 keeping path and port", () => {
    expect(toFirebasePhoneAuthLoopbackUrl("http://localhost:5174/login?x=1#y")).toBe(
      "http://127.0.0.1:5174/login?x=1#y",
    );
  });

  it("redirects blocked hosts", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        href: "http://localhost:5173/login",
        replace,
      },
    });
    expect(ensureFirebasePhoneAuthHost()).toBe(true);
    expect(replace).toHaveBeenCalledWith("http://127.0.0.1:5173/login");
  });

  it("assert throws after scheduling redirect on localhost", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        href: "http://localhost:5174/",
        replace,
      },
    });
    expect(() => assertFirebasePhoneAuthHostAllowed()).toThrow(FirebaseClientAuthError);
    expect(replace).toHaveBeenCalled();
  });
});
