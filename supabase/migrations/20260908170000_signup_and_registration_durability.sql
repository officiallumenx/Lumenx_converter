-- Backend-owned app signup identities, atomic verification grant exchange, and
-- resumable registration approval claims.

CREATE TABLE IF NOT EXISTS public.app_user_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profile(id) ON DELETE CASCADE,
  app text NOT NULL CHECK (app IN ('admissions', 'careers')),
  account_type text NOT NULL CHECK (
    account_type IN ('parent', 'institute_admin', 'job_seeker', 'recruiter')
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app),
  CHECK (
    (app = 'admissions' AND account_type IN ('parent', 'institute_admin'))
    OR (app = 'careers' AND account_type IN ('job_seeker', 'recruiter'))
  )
);

DROP TRIGGER IF EXISTS app_user_identity_set_updated_at ON public.app_user_identity;
CREATE TRIGGER app_user_identity_set_updated_at
  BEFORE UPDATE ON public.app_user_identity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_user_identity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_user_identity FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_user_identity TO service_role;

CREATE OR REPLACE FUNCTION public.consume_signup_verification_grants(
  p_token_hashes text[],
  p_subject_key text,
  p_required_destinations text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  matched_count integer;
  required_count integer;
BEGIN
  IF cardinality(p_token_hashes) = 0
     OR cardinality(p_token_hashes) <> cardinality(
       ARRAY(SELECT DISTINCT value FROM unnest(p_token_hashes) AS value)
     )
  THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.auth_verification_grant
  WHERE token_hash = ANY(p_token_hashes)
  FOR UPDATE;

  SELECT count(*) INTO matched_count
  FROM public.auth_verification_grant
  WHERE token_hash = ANY(p_token_hashes)
    AND purpose = 'signup_verify'
    AND consumed_at IS NULL
    AND expires_at > now()
    AND metadata->>'subject_key' = lower(trim(p_subject_key));

  SELECT count(*) INTO required_count
  FROM unnest(p_required_destinations) AS required(destination)
  WHERE EXISTS (
    SELECT 1
    FROM public.auth_verification_grant grant_row
    WHERE grant_row.token_hash = ANY(p_token_hashes)
      AND grant_row.destination = required.destination
      AND grant_row.purpose = 'signup_verify'
      AND grant_row.consumed_at IS NULL
      AND grant_row.expires_at > now()
      AND grant_row.metadata->>'subject_key' = lower(trim(p_subject_key))
  );

  IF matched_count <> cardinality(p_token_hashes)
     OR required_count <> cardinality(p_required_destinations)
  THEN
    RETURN false;
  END IF;

  UPDATE public.auth_verification_grant
  SET consumed_at = now()
  WHERE token_hash = ANY(p_token_hashes);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_signup_verification_grants(
  p_token_hashes text[],
  p_subject_key text,
  p_required_destinations text[]
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT cardinality(p_token_hashes) > 0
    AND cardinality(p_token_hashes) = (
      SELECT count(DISTINCT value) FROM unnest(p_token_hashes) AS value
    )
    AND cardinality(p_token_hashes) = (
      SELECT count(*)
      FROM public.auth_verification_grant grant_row
      WHERE grant_row.token_hash = ANY(p_token_hashes)
        AND grant_row.purpose = 'signup_verify'
        AND grant_row.consumed_at IS NULL
        AND grant_row.expires_at > now()
        AND grant_row.metadata->>'subject_key' = lower(trim(p_subject_key))
    )
    AND cardinality(p_required_destinations) = (
      SELECT count(*)
      FROM unnest(p_required_destinations) AS required(destination)
      WHERE EXISTS (
        SELECT 1 FROM public.auth_verification_grant grant_row
        WHERE grant_row.token_hash = ANY(p_token_hashes)
          AND grant_row.destination = required.destination
          AND grant_row.purpose = 'signup_verify'
          AND grant_row.consumed_at IS NULL
          AND grant_row.expires_at > now()
          AND grant_row.metadata->>'subject_key' = lower(trim(p_subject_key))
      )
    );
$$;

REVOKE ALL ON FUNCTION public.consume_signup_verification_grants(
  text[], text, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_signup_verification_grants(
  text[], text, text[]
) TO service_role;
REVOKE ALL ON FUNCTION public.validate_signup_verification_grants(
  text[], text, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_signup_verification_grants(
  text[], text, text[]
) TO service_role;

ALTER TABLE public.institute_registration
  DROP CONSTRAINT IF EXISTS institute_registration_status_check;
ALTER TABLE public.institute_registration
  ADD CONSTRAINT institute_registration_status_check CHECK (
    status IN ('pending', 'approving', 'approved', 'rejected')
  );

CREATE OR REPLACE FUNCTION public.begin_institute_registration_approval(
  p_registration_id uuid,
  p_reviewer_user_id uuid
)
RETURNS SETOF public.institute_registration
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  registration public.institute_registration%ROWTYPE;
BEGIN
  SELECT * INTO registration
  FROM public.institute_registration
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF registration.status = 'rejected' THEN
    RAISE EXCEPTION 'registration already rejected' USING ERRCODE = '40001';
  END IF;
  IF registration.status IN ('approved', 'approving') THEN
    RETURN NEXT registration;
    RETURN;
  END IF;

  UPDATE public.institute_registration
  SET status = 'approving',
      reviewed_by = p_reviewer_user_id,
      reviewed_at = COALESCE(reviewed_at, now()),
      rejection_reason = NULL
  WHERE id = p_registration_id
  RETURNING * INTO registration;
  RETURN NEXT registration;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_institute_registration_approval(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_institute_registration_approval(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.finish_institute_registration_approval(
  p_registration_id uuid,
  p_institute_id uuid,
  p_reviewer_user_id uuid
)
RETURNS SETOF public.institute_registration
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  UPDATE public.institute_registration
  SET status = 'approved',
      institute_id = p_institute_id,
      reviewed_by = p_reviewer_user_id,
      reviewed_at = now(),
      rejection_reason = NULL
  WHERE id = p_registration_id
    AND status IN ('approving', 'approved')
    AND (institute_id IS NULL OR institute_id = p_institute_id)
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.finish_institute_registration_approval(
  uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_institute_registration_approval(
  uuid, uuid, uuid
) TO service_role;
