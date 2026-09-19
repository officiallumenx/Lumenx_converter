-- =============================================================================
-- LumenX Migration — Auth workflow fields on existing tables (no new tables)
-- Version: 20260907120000
--
-- Extends user_profile + login_otp_challenge for notebook login factors.
-- Passwords remain in Supabase Auth; PIN is hashed server-side only.
-- =============================================================================

-- Login factors on existing person record (1:1 with auth.users).
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS username text NULL,
  ADD COLUMN IF NOT EXISTS pin_hash text NULL,
  ADD COLUMN IF NOT EXISTS pin_salt text NULL,
  ADD COLUMN IF NOT EXISTS pin_set_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS first_login_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_username_len_check;
ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_username_len_check CHECK (
    username IS NULL OR char_length(trim(username)) BETWEEN 3 AND 64
  );

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_pin_hash_check;
ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_pin_hash_check CHECK (
    pin_hash IS NULL OR char_length(pin_hash) = 128
  );

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_pin_salt_check;
ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_pin_salt_check CHECK (
    pin_salt IS NULL OR char_length(pin_salt) = 32
  );

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_pin_pair_check;
ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_pin_pair_check CHECK (
    (pin_hash IS NULL AND pin_salt IS NULL)
    OR (pin_hash IS NOT NULL AND pin_salt IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS user_profile_username_lower_uidx
  ON public.user_profile (lower(username))
  WHERE username IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.user_profile.username IS
  'Optional login username (unique, case-insensitive).';
COMMENT ON COLUMN public.user_profile.pin_hash IS
  'Scrypt PIN digest — written only by service_role / Hono auth APIs.';
COMMENT ON COLUMN public.user_profile.pin_salt IS
  'PIN salt (hex). Never expose to clients.';
COMMENT ON COLUMN public.user_profile.first_login_completed_at IS
  'Set when notebook first-login factors are completed.';

COMMENT ON TABLE public.user_profile IS
  'Person record linked to auth.users. Passwords/sessions in Auth; username/PIN factors stored here (hashed).';

-- Expand existing login OTP challenges (no new OTP table).
ALTER TABLE public.login_otp_challenge
  ALTER COLUMN institute_id DROP NOT NULL;

ALTER TABLE public.login_otp_challenge
  DROP CONSTRAINT IF EXISTS login_otp_challenge_purpose_check;

ALTER TABLE public.login_otp_challenge
  ADD CONSTRAINT login_otp_challenge_purpose_check CHECK (
    purpose IN (
      'parent_login',
      'staff_login',
      'nexus_login',
      'connect_login',
      'signup_verify',
      'password_reset',
      'pin_reset'
    )
  );

COMMENT ON TABLE public.login_otp_challenge IS
  'Short-lived login/signup/recovery OTP challenges. otp_hash only; service_role access.';
