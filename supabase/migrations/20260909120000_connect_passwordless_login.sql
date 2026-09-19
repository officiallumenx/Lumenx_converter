-- =============================================================================
-- Connect passwordless login credentials
-- Version: 20260909120000
-- =============================================================================

CREATE TABLE public.connect_login_credential (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id          uuid NOT NULL REFERENCES public.user_profile (id) ON DELETE CASCADE,
  institute_id             uuid NOT NULL REFERENCES public.institute (id) ON DELETE CASCADE,
  role                     text NOT NULL,
  phone_digits             text NOT NULL,
  pin_hash                 text NOT NULL,
  pin_salt                 text NOT NULL,
  phone_verified_at        timestamptz NOT NULL,
  first_login_completed_at timestamptz NOT NULL,
  failed_attempts          integer NOT NULL DEFAULT 0,
  locked_until             timestamptz NULL,
  last_failed_at           timestamptz NULL,
  last_authenticated_at    timestamptz NULL,
  pin_set_at               timestamptz NOT NULL DEFAULT now(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connect_login_credential_scope_key
    UNIQUE (user_profile_id, institute_id, role),
  CONSTRAINT connect_login_credential_role_check
    CHECK (role IN ('teacher', 'parent', 'student')),
  CONSTRAINT connect_login_credential_phone_check
    CHECK (phone_digits ~ '^[0-9]{10}$'),
  CONSTRAINT connect_login_credential_pin_hash_check
    CHECK (char_length(pin_hash) = 128),
  CONSTRAINT connect_login_credential_pin_salt_check
    CHECK (char_length(pin_salt) = 32),
  CONSTRAINT connect_login_credential_failed_attempts_check
    CHECK (failed_attempts >= 0)
);

CREATE INDEX connect_login_credential_lookup_idx
  ON public.connect_login_credential (institute_id, role, phone_digits);
CREATE INDEX connect_login_credential_locked_idx
  ON public.connect_login_credential (locked_until)
  WHERE locked_until IS NOT NULL;

CREATE TRIGGER connect_login_credential_set_updated_at
  BEFORE UPDATE ON public.connect_login_credential
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.connect_login_credential IS
  'Service-only, institute-and-role-scoped PIN credentials for Connect passwordless login.';

ALTER TABLE public.connect_login_credential ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.connect_login_credential FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_login_credential TO service_role;

-- Safely copy the former global PIN into every active Connect role. Aliases are
-- collapsed to the three public Connect roles and duplicate aliases are ignored.
WITH connect_scopes AS (
  SELECT DISTINCT
    m.user_id AS user_profile_id,
    m.institute_id,
    CASE
      WHEN mr.role_code IN ('teacher', 'class_teacher', 'staff') THEN 'teacher'
      WHEN mr.role_code = 'parent' THEN 'parent'
      WHEN mr.role_code IN ('student', 'learner') THEN 'student'
    END AS role
  FROM public.membership AS m
  JOIN public.membership_role AS mr ON mr.membership_id = m.id
  JOIN public.institute AS i ON i.id = m.institute_id
  WHERE m.status = 'active'
    AND m.deleted_at IS NULL
    AND i.status = 'active'
    AND i.deleted_at IS NULL
    AND mr.role_code IN (
      'teacher', 'class_teacher', 'staff', 'parent', 'student', 'learner'
    )
)
INSERT INTO public.connect_login_credential (
  user_profile_id,
  institute_id,
  role,
  phone_digits,
  pin_hash,
  pin_salt,
  phone_verified_at,
  first_login_completed_at,
  pin_set_at
)
SELECT
  up.id,
  scope.institute_id,
  scope.role,
  up.phone_digits,
  up.pin_hash,
  up.pin_salt,
  COALESCE(up.phone_verified_at, up.first_login_completed_at, up.pin_set_at, now()),
  COALESCE(up.first_login_completed_at, up.pin_set_at, now()),
  COALESCE(up.pin_set_at, up.first_login_completed_at, now())
FROM connect_scopes AS scope
JOIN public.user_profile AS up ON up.id = scope.user_profile_id
WHERE up.deleted_at IS NULL
  AND up.status <> 'disabled'
  AND up.phone_digits IS NOT NULL
  AND up.pin_hash IS NOT NULL
  AND up.pin_salt IS NOT NULL
ON CONFLICT (user_profile_id, institute_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_connect_login_pin(
  p_user_profile_id uuid,
  p_institute_id uuid,
  p_role text,
  p_phone_digits text,
  p_pin_hash text,
  p_pin_salt text,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF p_role NOT IN ('teacher', 'parent', 'student')
     OR p_phone_digits !~ '^[0-9]{10}$'
     OR char_length(p_pin_hash) <> 128
     OR char_length(p_pin_salt) <> 32
  THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profile AS up
    JOIN public.membership AS m ON m.user_id = up.id
    JOIN public.membership_role AS mr ON mr.membership_id = m.id
    JOIN public.institute AS i ON i.id = m.institute_id
    WHERE up.id = p_user_profile_id
      AND up.deleted_at IS NULL
      AND up.status <> 'disabled'
      AND up.phone_digits = p_phone_digits
      AND m.institute_id = p_institute_id
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND i.status = 'active'
      AND i.deleted_at IS NULL
      AND (
        (p_role = 'teacher' AND mr.role_code IN ('teacher', 'class_teacher', 'staff'))
        OR (p_role = 'parent' AND mr.role_code = 'parent')
        OR (p_role = 'student' AND mr.role_code IN ('student', 'learner'))
      )
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.connect_login_credential (
    user_profile_id, institute_id, role, phone_digits, pin_hash, pin_salt,
    phone_verified_at, first_login_completed_at, pin_set_at
  )
  VALUES (
    p_user_profile_id, p_institute_id, p_role, p_phone_digits, p_pin_hash, p_pin_salt,
    p_now, p_now, p_now
  )
  ON CONFLICT (user_profile_id, institute_id, role) DO UPDATE
  SET phone_digits = EXCLUDED.phone_digits,
      pin_hash = EXCLUDED.pin_hash,
      pin_salt = EXCLUDED.pin_salt,
      phone_verified_at = EXCLUDED.phone_verified_at,
      first_login_completed_at = EXCLUDED.first_login_completed_at,
      pin_set_at = EXCLUDED.pin_set_at,
      failed_attempts = 0,
      locked_until = NULL,
      last_failed_at = NULL
  WHERE public.connect_login_credential.first_login_completed_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_connect_login_pin(
  uuid, uuid, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_connect_login_pin(
  uuid, uuid, text, text, text, text, timestamptz
) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_connect_login_pin(
  p_user_profile_id uuid,
  p_institute_id uuid,
  p_role text,
  p_pin_hash text,
  p_now timestamptz DEFAULT now(),
  p_max_attempts integer DEFAULT 5,
  p_lock_seconds integer DEFAULT 900
)
RETURNS TABLE (outcome text, next_locked_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  credential public.connect_login_credential%ROWTYPE;
  next_attempts integer;
BEGIN
  SELECT *
  INTO credential
  FROM public.connect_login_credential
  WHERE user_profile_id = p_user_profile_id
    AND institute_id = p_institute_id
    AND role = p_role
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF credential.locked_until IS NOT NULL AND credential.locked_until > p_now THEN
    RETURN QUERY SELECT 'locked'::text, credential.locked_until;
    RETURN;
  END IF;

  IF credential.pin_hash <> p_pin_hash THEN
    next_attempts := CASE
      WHEN credential.locked_until IS NOT NULL AND credential.locked_until <= p_now THEN 1
      ELSE credential.failed_attempts + 1
    END;
    UPDATE public.connect_login_credential
    SET failed_attempts = next_attempts,
        last_failed_at = p_now,
        locked_until = CASE
          WHEN next_attempts >= least(greatest(p_max_attempts, 1), 50)
            THEN p_now + make_interval(secs => least(greatest(p_lock_seconds, 1), 86400))
          ELSE NULL
        END
    WHERE id = credential.id
    RETURNING locked_until INTO credential.locked_until;

    RETURN QUERY SELECT
      CASE WHEN credential.locked_until IS NULL THEN 'invalid' ELSE 'locked' END,
      credential.locked_until;
    RETURN;
  END IF;

  UPDATE public.connect_login_credential
  SET failed_attempts = 0,
      locked_until = NULL,
      last_authenticated_at = p_now
  WHERE id = credential.id;

  RETURN QUERY SELECT 'authenticated'::text, NULL::timestamptz;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_connect_login_pin(
  uuid, uuid, text, text, timestamptz, integer, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_connect_login_pin(
  uuid, uuid, text, text, timestamptz, integer, integer
) TO service_role;
