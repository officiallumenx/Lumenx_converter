/**
 * Email verification policy for API-mode institute registration.
 *
 * CURRENT STATE:
 * - Supabase Auth stores passwords; they are never persisted in institute_registration.payload.
 * - Dev/local may auto-confirm until SMTP is configured.
 * - Production builds enforce verification unless explicitly overridden.
 *
 * STILL MISSING (requires infrastructure when flipping prod):
 * 1. Production SMTP on Supabase (SendGrid/SES/etc.)
 * 2. enable_confirmations = true in Supabase project settings
 * 3. Set REGISTRATION_EMAIL_AUTO_CONFIRM=false on backend in production
 * 4. Admin: after POST /registrations, show "check your email" instead of immediate sign-in
 * 5. Handle Supabase "Email not confirmed" on login with clear UX
 *
 * Pending institute registration (Nexus approval) remains separate from email verification:
 * - Email auth = Supabase identity proof
 * - Registration status = GET /api/v1/registrations/me (Nexus review gate)
 */

function envFlag(name: string): string | undefined {
  const raw = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof raw === "string" ? raw.trim().toLowerCase() : undefined;
}

/**
 * When true, backend/UI expect auto-confirmed email at signup (dev/local default).
 * Override with VITE_REGISTRATION_EMAIL_AUTO_CONFIRM=true|false.
 * Production defaults to false.
 */
export function isRegistrationEmailAutoConfirmEnabled(): boolean {
  const flag = envFlag("VITE_REGISTRATION_EMAIL_AUTO_CONFIRM");
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return !import.meta.env.PROD;
}

/**
 * When true, login/signup UX treats unconfirmed email as a hard gate.
 * Override with VITE_ENFORCE_EMAIL_VERIFICATION=true|false.
 * Production defaults to true.
 */
export function isSupabaseEmailVerificationEnforced(): boolean {
  const flag = envFlag("VITE_ENFORCE_EMAIL_VERIFICATION");
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return Boolean(import.meta.env.PROD);
}
