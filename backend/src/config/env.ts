import { z } from "zod";

/**
 * Coerce blank/whitespace-only strings to undefined so optional fields
 * stay absent when the .env placeholder is left empty or the key is missing entirely.
 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return undefined;
    const trimmed = v.trim();
    return trimmed === "" ? undefined : trimmed;
  });

// ── Schema ──────────────────────────────────────────────────────────

export const envSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // API
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(8787),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173")
    .transform((raw) =>
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Supabase — optional during local dev; required in production
  SUPABASE_URL: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,

  // Firebase — optional during local dev; required in production
  FIREBASE_PROJECT_ID: optionalString,
  FIREBASE_CLIENT_EMAIL: optionalString,
  FIREBASE_PRIVATE_KEY: optionalString,

  /**
   * OTP delivery:
   * - demo (default in development/test): no network send; fixed/dev codes OK
   * - live: send via configured SMS/email providers; random codes; never echo OTP
   * Production always behaves as live regardless of this flag.
   */
  OTP_DELIVERY_MODE: z.enum(["demo", "live"]).default("demo"),

  // SMS — set OTP_SMS_PROVIDER=twilio|webhook for live parent/staff mobile OTPs
  OTP_SMS_PROVIDER: z.enum(["none", "twilio", "webhook"]).default("none"),
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_FROM_NUMBER: optionalString,
  OTP_SMS_WEBHOOK_URL: optionalString,
  OTP_SMS_WEBHOOK_TOKEN: optionalString,
  /** E.164 country prefix applied when destination is a 10-digit IN mobile (default +91). */
  OTP_SMS_DEFAULT_COUNTRY_CODE: z.string().default("+91"),

  // Email — set OTP_EMAIL_PROVIDER=resend|webhook for live staff email OTPs
  OTP_EMAIL_PROVIDER: z.enum(["none", "resend", "webhook"]).default("none"),
  RESEND_API_KEY: optionalString,
  OTP_EMAIL_FROM: optionalString,
  OTP_EMAIL_WEBHOOK_URL: optionalString,
  OTP_EMAIL_WEBHOOK_TOKEN: optionalString,

  /**
   * How often to persist derived subscription lifecycle (trial → grace → read_only)
   * and mark overdue renewals. Milliseconds. Default 1 hour. Set 0 to disable the loop.
   */
  SUBSCRIPTION_LIFECYCLE_SYNC_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(3_600_000),

  /**
   * Interval for announcement publish-due, alert-rule evaluate, and diary reminder workers.
   * Milliseconds. Default 60s. Set 0 to disable.
   */
  BACKGROUND_JOBS_INTERVAL_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(60_000),
});

// ── Derived types ───────────────────────────────────────────────────

export type Env = z.infer<typeof envSchema>;

// ── Loader ──────────────────────────────────────────────────────────

let cached: Env | null = null;

/**
 * Parse and validate `process.env` against the schema.
 *
 * - In development/test, missing Supabase/Firebase values are fine
 *   (they stay `undefined`).
 * - Call once at startup. The result is cached for the process lifetime.
 */
export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  if (cached && !overrides) return cached;

  const source: Record<string, string | undefined> = {
    ...(overrides ?? process.env),
  };

  // Containers / VMs must bind publicly unless the operator overrides HOST.
  if (
    (source.NODE_ENV ?? "development") === "production" &&
    (!source.HOST || !String(source.HOST).trim())
  ) {
    source.HOST = "0.0.0.0";
  }

  const result = envSchema.safeParse(source);

  if (result.success === false) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  // Always cache so domain helpers (OTP delivery mode, etc.) see the active env,
  // including test overrides. Tests must call resetEnvCache() between cases.
  // Production fail-closed packaging checks run from the process entrypoint
  // (see assertProductionEnv) — not here — so unit tests can still set NODE_ENV=production.
  cached = result.data;
  return result.data;
}

/** Reset the cached env — only for tests. */
export function resetEnvCache(): void {
  cached = null;
}
