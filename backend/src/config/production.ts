/**
 * Production fail-closed checks for deploy packaging.
 * Dev/test stay permissive; production refuses to boot without commercial/auth deps.
 */
import type { Env } from "./env.js";

export type ProductionEnvIssue = {
  code: string;
  message: string;
};

/** True when CORS only points at local/dev origins (unsafe for public API). */
export function corsLooksLocalOnly(origins: string[]): boolean {
  if (origins.length === 0) return true;
  return origins.every((origin) => {
    try {
      const url = new URL(origin);
      return (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0" ||
        url.hostname.endsWith(".local")
      );
    } catch {
      return true;
    }
  });
}

export function collectProductionEnvIssues(
  env: Env,
  raw: Record<string, string | undefined> = {},
): ProductionEnvIssue[] {
  if (env.NODE_ENV !== "production") return [];

  const issues: ProductionEnvIssue[] = [];

  if (!env.SUPABASE_URL) {
    issues.push({
      code: "SUPABASE_URL",
      message: "SUPABASE_URL is required in production",
    });
  }
  if (!env.SUPABASE_ANON_KEY) {
    issues.push({
      code: "SUPABASE_ANON_KEY",
      message: "SUPABASE_ANON_KEY is required in production",
    });
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push({
      code: "SUPABASE_SERVICE_ROLE_KEY",
      message: "SUPABASE_SERVICE_ROLE_KEY is required in production",
    });
  }

  if (!env.FIREBASE_PROJECT_ID) {
    issues.push({
      code: "FIREBASE_PROJECT_ID",
      message: "FIREBASE_PROJECT_ID is required in production",
    });
  }
  if (!env.FIREBASE_CLIENT_EMAIL) {
    issues.push({
      code: "FIREBASE_CLIENT_EMAIL",
      message: "FIREBASE_CLIENT_EMAIL is required in production",
    });
  }
  if (!env.FIREBASE_PRIVATE_KEY) {
    issues.push({
      code: "FIREBASE_PRIVATE_KEY",
      message: "FIREBASE_PRIVATE_KEY is required in production",
    });
  }

  if (!raw.CORS_ORIGINS?.trim()) {
    issues.push({
      code: "CORS_ORIGINS",
      message:
        "CORS_ORIGINS must be set explicitly in production (comma-separated https origins)",
    });
  } else if (corsLooksLocalOnly(env.CORS_ORIGINS)) {
    issues.push({
      code: "CORS_ORIGINS_LOCAL",
      message:
        "CORS_ORIGINS must include at least one non-localhost origin in production",
    });
  }

  if (env.OTP_SMS_PROVIDER === "none" && env.OTP_EMAIL_PROVIDER === "none") {
    issues.push({
      code: "OTP_PROVIDER",
      message:
        "Configure OTP_SMS_PROVIDER and/or OTP_EMAIL_PROVIDER for production login delivery",
    });
  }

  if (env.OTP_SMS_PROVIDER === "twilio") {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
      issues.push({
        code: "TWILIO",
        message:
          "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are required when OTP_SMS_PROVIDER=twilio",
      });
    }
  }
  if (env.OTP_SMS_PROVIDER === "webhook" && !env.OTP_SMS_WEBHOOK_URL) {
    issues.push({
      code: "OTP_SMS_WEBHOOK_URL",
      message: "OTP_SMS_WEBHOOK_URL is required when OTP_SMS_PROVIDER=webhook",
    });
  }
  if (env.OTP_EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.OTP_EMAIL_FROM) {
      issues.push({
        code: "RESEND",
        message:
          "RESEND_API_KEY and OTP_EMAIL_FROM are required when OTP_EMAIL_PROVIDER=resend",
      });
    }
  }
  if (env.OTP_EMAIL_PROVIDER === "webhook" && !env.OTP_EMAIL_WEBHOOK_URL) {
    issues.push({
      code: "OTP_EMAIL_WEBHOOK_URL",
      message: "OTP_EMAIL_WEBHOOK_URL is required when OTP_EMAIL_PROVIDER=webhook",
    });
  }

  return issues;
}

/** Throws a single Error listing every production packaging gap. */
export function assertProductionEnv(
  env: Env,
  raw: Record<string, string | undefined> = {},
): void {
  const issues = collectProductionEnvIssues(env, raw);
  if (issues.length === 0) return;
  const body = issues.map((i) => `  - ${i.code}: ${i.message}`).join("\n");
  throw new Error(`Production environment is not deploy-ready:\n${body}`);
}
