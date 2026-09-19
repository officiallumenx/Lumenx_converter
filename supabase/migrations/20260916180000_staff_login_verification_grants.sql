-- Allow staff_login purpose on auth verification grants (Admin notebook workflow).
ALTER TABLE public.auth_verification_grant
  DROP CONSTRAINT IF EXISTS auth_verification_grant_purpose_check;

ALTER TABLE public.auth_verification_grant
  ADD CONSTRAINT auth_verification_grant_purpose_check
  CHECK (purpose IN (
    'signup_verify',
    'nexus_login',
    'staff_login',
    'password_reset',
    'pin_reset'
  ));
