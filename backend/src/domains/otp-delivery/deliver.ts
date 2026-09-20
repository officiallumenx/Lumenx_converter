/**
 * Deliver login OTP codes via configured SMS/email providers.
 * Demo mode (default outside production): no network send.
 * Live mode / production: must send; never returns the code to clients.
 */
import { AppError } from "../../errors/app-error.js";
import { loadEnv, type Env } from "../../config/env.js";
import type {
  DeliverLoginOtpInput,
  DeliverLoginOtpResult,
  OtpDeliveryChannel,
} from "./types.js";

export type { DeliverLoginOtpInput, DeliverLoginOtpResult, OtpDeliveryChannel };

type FetchLike = typeof fetch;

let fetchImpl: FetchLike = fetch;

/** Test helper — inject a mock fetch. */
export function setOtpDeliveryFetch(next: FetchLike): void {
  fetchImpl = next;
}

/** Test helper — restore real fetch. */
export function resetOtpDeliveryFetch(): void {
  fetchImpl = fetch;
}

function resolveEnv(env?: Env): Env {
  return env ?? loadEnv();
}

export function isOtpDemoMode(env?: Env): boolean {
  const e = resolveEnv(env);
  if (e.NODE_ENV === "production") return false;
  return e.OTP_DELIVERY_MODE !== "live";
}

function purposeLabel(purpose: DeliverLoginOtpInput["purpose"]): string {
  switch (purpose) {
    case "parent_login":
      return "parent login";
    case "staff_login":
      return "staff login";
    case "nexus_login":
      return "Nexus login";
    case "connect_login":
      return "Connect login";
    case "signup_verify":
      return "signup verification";
    case "password_reset":
      return "password reset";
    case "pin_reset":
      return "PIN reset";
    default:
      return "login";
  }
}

function buildSmsBody(otp: string, purpose: DeliverLoginOtpInput["purpose"]): string {
  return `LumenX ${purposeLabel(purpose)} code: ${otp}. Valid for 5 minutes. Do not share.`;
}

function buildEmailSubject(purpose: DeliverLoginOtpInput["purpose"]): string {
  return `LumenX ${purposeLabel(purpose)} verification code`;
}

function buildEmailText(otp: string, purpose: DeliverLoginOtpInput["purpose"]): string {
  return [
    `Your LumenX ${purposeLabel(purpose)} verification code is:`,
    "",
    otp,
    "",
    "This code expires in 5 minutes. If you did not request it, ignore this email.",
  ].join("\n");
}

function toE164(destination: string, countryCode: string): string {
  const digits = destination.replace(/\D/g, "");
  if (destination.trim().startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }
  const local = digits.slice(-10);
  const cc = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
  return `${cc}${local}`;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw AppError.internal("OTP delivery network failed");
  }
  if (!response.ok) {
    throw AppError.internal(`OTP delivery failed (${response.status})`);
  }
}

async function sendSmsTwilio(env: Env, to: string, body: string): Promise<string> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw AppError.internal(
      "OTP SMS is misconfigured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).",
    );
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } catch {
    throw AppError.internal("OTP SMS network failed");
  }
  if (!response.ok) {
    throw AppError.internal(`OTP SMS failed (${response.status})`);
  }
  return "twilio";
}

async function sendSmsWebhook(env: Env, to: string, otp: string, message: string, purpose: string): Promise<string> {
  const url = env.OTP_SMS_WEBHOOK_URL;
  if (!url) {
    throw AppError.internal("OTP SMS is misconfigured (OTP_SMS_WEBHOOK_URL)");
  }
  const headers: Record<string, string> = {};
  if (env.OTP_SMS_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${env.OTP_SMS_WEBHOOK_TOKEN}`;
  }
  await postJson(url, { channel: "sms", to, otp, message, purpose }, headers);
  return "webhook";
}

/**
 * Deliver LumenX-generated OTP via StartMessaging SMS API.
 * Auth verify stays in LumenX (`login_otp_challenge`) — do not use StartMessaging /otp/verify.
 */
async function sendSmsStartMessaging(
  env: Env,
  to: string,
  otp: string,
  purpose: string,
): Promise<string> {
  const apiKey = env.STARTMESSAGING_API_KEY?.trim();
  const templateId = env.STARTMESSAGING_TEMPLATE_ID?.trim();
  if (!apiKey || !templateId) {
    throw AppError.internal(
      "OTP SMS is misconfigured (STARTMESSAGING_API_KEY / STARTMESSAGING_TEMPLATE_ID)",
    );
  }
  const base = (env.STARTMESSAGING_BASE_URL?.trim() || "https://api.startmessaging.com").replace(
    /\/+$/,
    "",
  );
  const url = `${base}/otp/send`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        phoneNumber: to,
        templateId,
        variables: {
          otp,
          appName: "LumenX",
          purpose,
        },
      }),
    });
  } catch {
    throw AppError.internal("OTP SMS network failed");
  }
  if (!response.ok) {
    throw AppError.internal(`OTP SMS failed (${response.status})`);
  }
  return "startmessaging";
}

async function sendEmailResend(env: Env, to: string, subject: string, text: string): Promise<string> {
  const key = env.RESEND_API_KEY;
  const from = env.OTP_EMAIL_FROM;
  if (!key || !from) {
    throw AppError.internal(
      "OTP email is misconfigured (RESEND_API_KEY / OTP_EMAIL_FROM)",
    );
  }
  await postJson(
    "https://api.resend.com/emails",
    { from, to: [to], subject, text },
    { Authorization: `Bearer ${key}` },
  );
  return "resend";
}

async function sendEmailWebhook(
  env: Env,
  to: string,
  otp: string,
  subject: string,
  text: string,
  purpose: string,
): Promise<string> {
  const url = env.OTP_EMAIL_WEBHOOK_URL;
  if (!url) {
    throw AppError.internal("OTP email is misconfigured (OTP_EMAIL_WEBHOOK_URL)");
  }
  const headers: Record<string, string> = {};
  if (env.OTP_EMAIL_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${env.OTP_EMAIL_WEBHOOK_TOKEN}`;
  }
  await postJson(
    url,
    { channel: "email", to, otp, subject, text, purpose },
    headers,
  );
  return "webhook";
}

async function deliverLive(
  env: Env,
  input: DeliverLoginOtpInput,
): Promise<DeliverLoginOtpResult> {
  if (input.channel === "sms") {
    if (env.OTP_SMS_PROVIDER === "none") {
      throw AppError.internal(
        "Live OTP SMS requires OTP_SMS_PROVIDER=twilio, webhook, or startmessaging",
      );
    }
    const to = toE164(input.destination, env.OTP_SMS_DEFAULT_COUNTRY_CODE);
    const message = buildSmsBody(input.otp, input.purpose);
    let provider: string;
    if (env.OTP_SMS_PROVIDER === "twilio") {
      provider = await sendSmsTwilio(env, to, message);
    } else if (env.OTP_SMS_PROVIDER === "startmessaging") {
      provider = await sendSmsStartMessaging(env, to, input.otp, input.purpose);
    } else {
      provider = await sendSmsWebhook(env, to, input.otp, message, input.purpose);
    }
    return { mode: "live", provider, channel: "sms" };
  }

  if (env.OTP_EMAIL_PROVIDER === "none") {
    throw AppError.internal(
      "Live OTP email requires OTP_EMAIL_PROVIDER=resend or webhook",
    );
  }
  const subject = buildEmailSubject(input.purpose);
  const text = buildEmailText(input.otp, input.purpose);
  const to = input.destination.trim().toLowerCase();
  const provider =
    env.OTP_EMAIL_PROVIDER === "resend"
      ? await sendEmailResend(env, to, subject, text)
      : await sendEmailWebhook(env, to, input.otp, subject, text, input.purpose);
  return { mode: "live", provider, channel: "email" };
}

/**
 * Deliver an OTP. In demo mode this is a no-op success.
 * In live/production it sends via the configured provider for the channel.
 */
export async function deliverLoginOtp(
  input: DeliverLoginOtpInput,
  env?: Env,
): Promise<DeliverLoginOtpResult> {
  const e = resolveEnv(env);
  const destination = input.destination.trim();
  if (!destination) {
    throw AppError.validation("OTP destination is required");
  }
  if (!/^\d{6}$/.test(input.otp.trim())) {
    throw AppError.internal("Invalid OTP payload");
  }

  if (isOtpDemoMode(e)) {
    return { mode: "demo", provider: "demo", channel: input.channel };
  }

  return deliverLive(e, {
    ...input,
    destination,
    otp: input.otp.trim(),
  });
}
