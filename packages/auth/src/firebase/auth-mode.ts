/**
 * Auth provider selection — API-only product mode.
 * Demo Mode is no longer a supported product mode.
 * Never silently fall back to demo OTP or mock identity.
 *
 * Interactive login is Supabase-only. Firebase remains for FCM/Analytics/Crashlytics only.
 */

/** Product auth mode. Only `"api"` is supported. */
export type LumenXAuthMode = "api";
/** Interactive identity provider — Supabase Auth only. */
export type LumenXAuthProvider = "supabase";

const DEMO_MODE_REJECTED =
  "LumenX Demo Mode is no longer supported. Set VITE_*_AUTH_MODE=api (or omit it). API mode is the only product mode.";

/**
 * Normalize product auth mode.
 * - unset / "api" → "api"
 * - "demo" → throws (rejected)
 * - any other value → "api"
 */
export function normalizeAuthMode(raw: string | undefined | null): LumenXAuthMode {
  const value = raw?.trim().toLowerCase();
  if (value === "demo") {
    throw new Error(DEMO_MODE_REJECTED);
  }
  return "api";
}

/**
 * Interactive auth provider under API mode.
 * Always supabase (Firebase Auth has been removed).
 */
export function normalizeAuthProvider(
  _raw?: string | null,
): LumenXAuthProvider {
  return "supabase";
}

export function resolveAuthStack(input: {
  mode?: string | null;
  provider?: string | null;
}): { mode: LumenXAuthMode; provider: LumenXAuthProvider } {
  return {
    mode: normalizeAuthMode(input.mode),
    provider: normalizeAuthProvider(input.provider),
  };
}

/**
 * Demo OTP / mock identity is never allowed in product code.
 * Kept as a named check so call sites fail closed.
 */
export function isDemoAuthenticationAllowed(_mode?: LumenXAuthMode | string): boolean {
  return false;
}

/**
 * Throws whenever demo authentication is attempted.
 * Call before any demo OTP / mockSignIn / DEMO_USERS path.
 */
export function assertNotDemoFallback(
  _mode: LumenXAuthMode | string | undefined,
  context: string,
): never {
  throw new Error(
    `${context}: demo authentication is disabled. Use Supabase Auth and the LumenX session API.`,
  );
}

/** Boot-time guard: product shells must only initialize in API mode. */
export function assertApiOnlyProductMode(
  rawMode: string | undefined | null,
  appLabel: string,
): LumenXAuthMode {
  try {
    return normalizeAuthMode(rawMode);
  } catch (err) {
    const message = err instanceof Error ? err.message : DEMO_MODE_REJECTED;
    throw new Error(`${appLabel}: ${message}`);
  }
}
