/**
 * Email verification policy for API-mode institute registration.
 *
 * CURRENT STATE (Phase 8 audit):
 * - Supabase Auth stores passwords; they are never persisted in institute_registration.payload.
 * - Backend provisionAuthUser uses email_confirm: true (auto-confirms) until SMTP is configured.
 * - Supabase config.toml has enable_confirmations = false locally.
 *
 * STILL MISSING (requires infrastructure):
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

/** When true, backend auto-confirms email at signup (dev/local default). */
export function isRegistrationEmailAutoConfirmEnabled(): boolean {
  return true;
}

/** Real Supabase email confirmation is not enforced until infra + code toggles above are live. */
export function isSupabaseEmailVerificationEnforced(): boolean {
  return false;
}
