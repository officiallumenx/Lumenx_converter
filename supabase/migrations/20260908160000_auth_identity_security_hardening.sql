-- =============================================================================
-- Canonical phone identity, profile write hardening, and atomic verification
-- Version: 20260908160000
-- =============================================================================

-- Canonical representation used by login/identity lookups. LumenX currently
-- provisions Indian mobile identities, so country-prefixed input is reduced to
-- the same last-ten-digits representation already used by the API.
CREATE OR REPLACE FUNCTION public.canonical_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN length(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 10
      THEN right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 10)
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.canonical_phone_digits(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonical_phone_digits(text)
  TO authenticated, service_role;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS phone_digits text NULL;

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_phone_digits_check;
ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_phone_digits_check CHECK (
    phone_digits IS NULL OR phone_digits ~ '^[0-9]{10}$'
  );

-- Retain an actionable report instead of allowing pre-existing duplicates to
-- abort deployment. Colliding active profiles remain queryable by legacy phone,
-- but phone_digits stays NULL until an operator resolves the collision.
CREATE TABLE IF NOT EXISTS public.user_profile_phone_collision (
  profile_id   uuid PRIMARY KEY,
  phone_digits text NOT NULL,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz NULL,
  CONSTRAINT user_profile_phone_collision_digits_check
    CHECK (phone_digits ~ '^[0-9]{10}$')
);

WITH candidates AS (
  SELECT
    id,
    public.canonical_phone_digits(phone) AS digits,
    count(*) OVER (
      PARTITION BY public.canonical_phone_digits(phone)
    ) AS duplicate_count
  FROM public.user_profile
  WHERE deleted_at IS NULL
    AND public.canonical_phone_digits(phone) IS NOT NULL
)
INSERT INTO public.user_profile_phone_collision (profile_id, phone_digits)
SELECT id, digits
FROM candidates
WHERE duplicate_count > 1
ON CONFLICT (profile_id) DO UPDATE
SET phone_digits = EXCLUDED.phone_digits,
    detected_at = now(),
    resolved_at = NULL;

WITH active_counts AS (
  SELECT
    public.canonical_phone_digits(phone) AS digits,
    count(*) AS profile_count
  FROM public.user_profile
  WHERE deleted_at IS NULL
    AND public.canonical_phone_digits(phone) IS NOT NULL
  GROUP BY public.canonical_phone_digits(phone)
)
UPDATE public.user_profile AS up
SET phone_digits = CASE
  WHEN up.deleted_at IS NOT NULL THEN public.canonical_phone_digits(up.phone)
  WHEN (
    SELECT counts.profile_count
    FROM active_counts AS counts
    WHERE counts.digits = public.canonical_phone_digits(up.phone)
  ) = 1 THEN public.canonical_phone_digits(up.phone)
  ELSE NULL
END;

CREATE UNIQUE INDEX IF NOT EXISTS user_profile_phone_digits_uidx
  ON public.user_profile (phone_digits)
  WHERE phone_digits IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_user_profile_phone_digits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.phone_digits := public.canonical_phone_digits(NEW.phone);
  IF TG_OP = 'UPDATE'
     AND NEW.phone_digits IS DISTINCT FROM OLD.phone_digits
  THEN
    NEW.phone_verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profile_sync_phone_digits ON public.user_profile;
CREATE TRIGGER user_profile_sync_phone_digits
  BEFORE INSERT OR UPDATE OF phone ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_phone_digits();

COMMENT ON COLUMN public.user_profile.phone_digits IS
  'Canonical last-ten-digit phone identity. NULL for invalid or quarantined duplicate legacy values.';
COMMENT ON TABLE public.user_profile_phone_collision IS
  'Operator-visible report of legacy active profiles that collided during canonical phone backfill.';

ALTER TABLE public.user_profile_phone_collision ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_profile_phone_collision FROM anon, authenticated;
GRANT ALL ON TABLE public.user_profile_phone_collision TO service_role;

-- Defense in depth: authenticated users retain only presentation/phone changes.
-- Security-sensitive identity and verification state remains service-role only.
REVOKE UPDATE ON TABLE public.user_profile FROM authenticated;
GRANT UPDATE (display_name, phone, avatar_url) ON public.user_profile
  TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_user_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated'
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.firebase_uid IS DISTINCT FROM OLD.firebase_uid
       OR NEW.firebase_linked_at IS DISTINCT FROM OLD.firebase_linked_at
       OR NEW.username IS DISTINCT FROM OLD.username
       OR NEW.pin_hash IS DISTINCT FROM OLD.pin_hash
       OR NEW.pin_salt IS DISTINCT FROM OLD.pin_salt
       OR NEW.pin_set_at IS DISTINCT FROM OLD.pin_set_at
       OR NEW.first_login_completed_at IS DISTINCT FROM OLD.first_login_completed_at
       OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at
       OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
     )
  THEN
    RAISE EXCEPTION 'security-sensitive user_profile fields are service-role only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profile_guard_security_fields ON public.user_profile;
CREATE TRIGGER user_profile_guard_security_fields
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_profile_security_fields();

-- Consume an OTP challenge under a row lock. Successful verification deletes
-- the row in the same transaction; failures increment/burn attempts atomically.
CREATE OR REPLACE FUNCTION public.consume_login_otp_challenge(
  p_purpose text,
  p_challenge_key text,
  p_otp_hash text,
  p_now timestamptz DEFAULT now(),
  p_max_attempts integer DEFAULT 5
)
RETURNS TABLE (
  outcome text,
  challenge_id uuid,
  institute_id uuid,
  subject_id uuid,
  channel text,
  destination text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  challenge public.login_otp_challenge%ROWTYPE;
BEGIN
  SELECT *
  INTO challenge
  FROM public.login_otp_challenge
  WHERE purpose = p_purpose
    AND challenge_key = p_challenge_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::uuid,
      NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF challenge.expires_at <= p_now THEN
    DELETE FROM public.login_otp_challenge WHERE id = challenge.id;
    RETURN QUERY SELECT 'expired'::text, challenge.id, NULL::uuid,
      NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF challenge.otp_hash <> p_otp_hash THEN
    IF challenge.attempt_count + 1 >= least(greatest(p_max_attempts, 1), 50) THEN
      DELETE FROM public.login_otp_challenge WHERE id = challenge.id;
      RETURN QUERY SELECT 'attempts_exhausted'::text, challenge.id, NULL::uuid,
        NULL::uuid, NULL::text, NULL::text;
    ELSE
      UPDATE public.login_otp_challenge
      SET attempt_count = attempt_count + 1
      WHERE id = challenge.id;
      RETURN QUERY SELECT 'mismatch'::text, challenge.id, NULL::uuid,
        NULL::uuid, NULL::text, NULL::text;
    END IF;
    RETURN;
  END IF;

  DELETE FROM public.login_otp_challenge WHERE id = challenge.id;
  RETURN QUERY SELECT 'consumed'::text, challenge.id, challenge.institute_id,
    challenge.subject_id, challenge.channel, challenge.destination;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_login_otp_challenge(
  text, text, text, timestamptz, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_otp_challenge(
  text, text, text, timestamptz, integer
) TO service_role;

-- One-use workflow grants let a backend exchange a verified OTP for a short
-- signup/recovery capability without trusting mutable client-side state.
CREATE TABLE IF NOT EXISTS public.auth_verification_grant (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL,
  purpose       text NOT NULL,
  subject_id    uuid NULL,
  destination   text NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_verification_grant_token_hash_check
    CHECK (char_length(token_hash) = 64),
  CONSTRAINT auth_verification_grant_purpose_check
    CHECK (purpose IN ('signup_verify', 'password_reset', 'pin_reset'))
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_verification_grant_token_uidx
  ON public.auth_verification_grant (token_hash);
CREATE INDEX IF NOT EXISTS auth_verification_grant_expiry_idx
  ON public.auth_verification_grant (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.auth_verification_grant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_verification_grant FROM anon, authenticated;
GRANT ALL ON TABLE public.auth_verification_grant TO service_role;

CREATE OR REPLACE FUNCTION public.consume_auth_verification_grant(
  p_token_hash text,
  p_purpose text,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  grant_id uuid,
  subject_id uuid,
  destination text,
  metadata jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  UPDATE public.auth_verification_grant AS grant_row
  SET consumed_at = p_now
  WHERE grant_row.token_hash = p_token_hash
    AND grant_row.purpose = p_purpose
    AND grant_row.consumed_at IS NULL
    AND grant_row.expires_at > p_now
  RETURNING grant_row.id, grant_row.subject_id, grant_row.destination,
    grant_row.metadata;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_verification_grant(
  text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_verification_grant(
  text, text, timestamptz
) TO service_role;

-- Shared RLS helpers now reject memberships belonging to suspended, inactive,
-- archived, or deleted institutes. Existing policies inherit this behavior.
CREATE OR REPLACE FUNCTION public.is_institute_member(p_institute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membership m
    JOIN public.institute i ON i.id = m.institute_id
    WHERE m.institute_id = p_institute_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND i.status = 'active'
      AND i.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_institute_role(
  p_institute_id uuid,
  VARIADIC p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.membership m
    JOIN public.institute i ON i.id = m.institute_id
    JOIN public.membership_role mr ON mr.membership_id = m.id
    WHERE m.institute_id = p_institute_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND i.status = 'active'
      AND i.deleted_at IS NULL
      AND mr.role_code = ANY (p_roles)
  );
$$;
