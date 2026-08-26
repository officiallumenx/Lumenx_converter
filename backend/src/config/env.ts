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

  const source = overrides ?? process.env;
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  if (!overrides) cached = result.data;
  return result.data;
}

/** Reset the cached env — only for tests. */
export function resetEnvCache(): void {
  cached = null;
}
