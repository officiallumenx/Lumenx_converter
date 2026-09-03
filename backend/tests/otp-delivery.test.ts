import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import {
  deliverLoginOtp,
  isOtpDemoMode,
  resetOtpDeliveryFetch,
  setOtpDeliveryFetch,
} from "../src/domains/otp-delivery/index.js";
import { AppError } from "../src/errors/app-error.js";

beforeEach(() => {
  resetEnvCache();
  resetOtpDeliveryFetch();
});

afterEach(() => {
  resetEnvCache();
  resetOtpDeliveryFetch();
  vi.restoreAllMocks();
});

describe("otp delivery", () => {
  it("demo mode skips network send", async () => {
    const env = loadEnv({
      NODE_ENV: "development",
      OTP_DELIVERY_MODE: "demo",
      LOG_LEVEL: "error",
    });
    expect(isOtpDemoMode(env)).toBe(true);

    const fetchSpy = vi.fn();
    setOtpDeliveryFetch(fetchSpy as unknown as typeof fetch);

    const result = await deliverLoginOtp(
      {
        channel: "sms",
        destination: "9876543210",
        otp: "123456",
        purpose: "parent_login",
      },
      env,
    );
    expect(result.mode).toBe("demo");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("production always uses live mode even if OTP_DELIVERY_MODE=demo", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OTP_DELIVERY_MODE: "demo",
      LOG_LEVEL: "error",
    });
    expect(isOtpDemoMode(env)).toBe(false);
  });

  it("live SMS via webhook posts payload", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OTP_DELIVERY_MODE: "live",
      OTP_SMS_PROVIDER: "webhook",
      OTP_SMS_WEBHOOK_URL: "https://hooks.example/sms",
      OTP_SMS_WEBHOOK_TOKEN: "secret",
      OTP_SMS_DEFAULT_COUNTRY_CODE: "+91",
      LOG_LEVEL: "error",
    });

    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    setOtpDeliveryFetch(fetchSpy as unknown as typeof fetch);

    const result = await deliverLoginOtp(
      {
        channel: "sms",
        destination: "9876543210",
        otp: "654321",
        purpose: "parent_login",
      },
      env,
    );
    expect(result).toEqual({ mode: "live", provider: "webhook", channel: "sms" });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://hooks.example/sms");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret",
    });
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.to).toBe("+919876543210");
    expect(body.otp).toBe("654321");
    expect(body.message).toContain("654321");
  });

  it("live SMS via Twilio posts form body", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OTP_SMS_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "ACtest",
      TWILIO_AUTH_TOKEN: "tok",
      TWILIO_FROM_NUMBER: "+15005550006",
      LOG_LEVEL: "error",
    });

    const fetchSpy = vi.fn(async () => new Response("{}", { status: 201 }));
    setOtpDeliveryFetch(fetchSpy as unknown as typeof fetch);

    await deliverLoginOtp(
      {
        channel: "sms",
        destination: "9876543210",
        otp: "111222",
        purpose: "staff_login",
      },
      env,
    );

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain("api.twilio.com");
    expect(String(url)).toContain("ACtest");
    const form = new URLSearchParams(String((init as RequestInit).body));
    expect(form.get("To")).toBe("+919876543210");
    expect(form.get("From")).toBe("+15005550006");
    expect(form.get("Body")).toContain("111222");
  });

  it("live email via Resend posts JSON", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OTP_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      OTP_EMAIL_FROM: "otp@lumenx.app",
      LOG_LEVEL: "error",
    });

    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    setOtpDeliveryFetch(fetchSpy as unknown as typeof fetch);

    const result = await deliverLoginOtp(
      {
        channel: "email",
        destination: "teacher@school.edu",
        otp: "999888",
        purpose: "staff_login",
      },
      env,
    );
    expect(result.provider).toBe("resend");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.to).toEqual(["teacher@school.edu"]);
    expect(body.text).toContain("999888");
  });

  it("live SMS without provider throws", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OTP_SMS_PROVIDER: "none",
      LOG_LEVEL: "error",
    });
    await expect(
      deliverLoginOtp(
        {
          channel: "sms",
          destination: "9876543210",
          otp: "123456",
          purpose: "parent_login",
        },
        env,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("provider HTTP failure surfaces as internal error", async () => {
    const env = loadEnv({
      NODE_ENV: "production",
      OTP_SMS_PROVIDER: "webhook",
      OTP_SMS_WEBHOOK_URL: "https://hooks.example/sms",
      LOG_LEVEL: "error",
    });
    setOtpDeliveryFetch(
      vi.fn(async () => new Response("fail", { status: 500 })) as unknown as typeof fetch,
    );
    await expect(
      deliverLoginOtp(
        {
          channel: "sms",
          destination: "9876543210",
          otp: "123456",
          purpose: "parent_login",
        },
        env,
      ),
    ).rejects.toMatchObject({ status: 500, code: "INTERNAL_ERROR" });
  });
});
