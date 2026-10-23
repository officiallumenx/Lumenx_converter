-- =============================================================================
-- LumenX Migration — Atomic institute registration + legal consent
-- Version: 20261023140000
--
-- Depends on: 20261023120000_institute_registration_legal_consent.sql
--
-- Replaces the prior application-level "insert then upsert (+ compensating delete)"
-- pattern with a single SECURITY DEFINER RPC so both rows commit or neither does.
-- Auth user provisioning remains outside Postgres (Supabase Auth) — unchanged.
--
-- EXECUTE: service_role only (Hono). Not granted to anon/authenticated.
-- Denylist: do not apply to production (kmpzflsurepjwqnfqyld) without approval.
-- =============================================================================

-- Shared: validate consent JSON and insert/upsert consent rows for a registration.
CREATE OR REPLACE FUNCTION public._institute_registration_write_legal_consent(
  p_registration_id uuid,
  p_consent_documents jsonb,
  p_consent_action text,
  p_accepted_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  doc jsonb;
  has_terms boolean := false;
  has_privacy boolean := false;
  doc_id text;
  doc_version text;
BEGIN
  IF p_consent_action IS NULL OR p_consent_action NOT IN (
    'registration_accept', 'registration_resubmit'
  ) THEN
    RAISE EXCEPTION 'invalid consent action'
      USING ERRCODE = '22023';
  END IF;

  IF p_consent_documents IS NULL
     OR jsonb_typeof(p_consent_documents) <> 'array'
     OR jsonb_array_length(p_consent_documents) < 1 THEN
    RAISE EXCEPTION 'legal consent documents required'
      USING ERRCODE = '22023';
  END IF;

  FOR doc IN SELECT value FROM jsonb_array_elements(p_consent_documents)
  LOOP
    doc_id := NULLIF(trim(doc->>'id'), '');
    doc_version := NULLIF(trim(doc->>'version'), '');

    IF doc_id IS NULL OR doc_version IS NULL THEN
      RAISE EXCEPTION 'malformed legal consent document'
        USING ERRCODE = '22023';
    END IF;

    IF doc_id NOT IN ('admin_terms', 'admin_privacy', 'cookie_policy') THEN
      RAISE EXCEPTION 'unknown legal document id: %', doc_id
        USING ERRCODE = '22023';
    END IF;

    IF doc_version !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'invalid legal document version: %', doc_version
        USING ERRCODE = '22023';
    END IF;

    IF doc_id = 'admin_terms' THEN has_terms := true; END IF;
    IF doc_id = 'admin_privacy' THEN has_privacy := true; END IF;

    INSERT INTO public.institute_registration_legal_consent (
      registration_id,
      document_id,
      document_version,
      action,
      accepted_at
    ) VALUES (
      p_registration_id,
      doc_id,
      doc_version,
      p_consent_action,
      COALESCE(p_accepted_at, now())
    )
    ON CONFLICT (registration_id, document_id) DO UPDATE
    SET document_version = EXCLUDED.document_version,
        action = EXCLUDED.action,
        accepted_at = EXCLUDED.accepted_at;
  END LOOP;

  IF NOT has_terms OR NOT has_privacy THEN
    RAISE EXCEPTION 'required legal consent documents missing (admin_terms, admin_privacy)'
      USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._institute_registration_write_legal_consent(
  uuid, jsonb, text, timestamptz
) FROM PUBLIC, anon, authenticated;
-- Helper only; keep callable by service_role for tests/ops, but prefer wrappers.
GRANT EXECUTE ON FUNCTION public._institute_registration_write_legal_consent(
  uuid, jsonb, text, timestamptz
) TO service_role;

COMMENT ON FUNCTION public._institute_registration_write_legal_consent(
  uuid, jsonb, text, timestamptz
) IS
  'Internal: upsert legal consent rows; requires admin_terms + admin_privacy.';

-- Atomic create: registration row + required consent in one transaction.
CREATE OR REPLACE FUNCTION public.create_institute_registration_with_legal_consent(
  p_applicant_user_id uuid,
  p_applicant_name text,
  p_email text,
  p_phone text,
  p_payload jsonb,
  p_institute_code text,
  p_institute_type text,
  p_education_board text,
  p_school_email text,
  p_school_phone text,
  p_applicant_username text,
  p_admin_designation text,
  p_country text,
  p_state text,
  p_district text,
  p_city text,
  p_area text,
  p_street text,
  p_landmark text,
  p_pincode text,
  p_website text,
  p_consent_documents jsonb,
  p_consent_action text DEFAULT 'registration_accept',
  p_accepted_at timestamptz DEFAULT now()
)
RETURNS SETOF public.institute_registration
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  registration public.institute_registration%ROWTYPE;
BEGIN
  IF p_applicant_user_id IS NULL OR NULLIF(trim(p_applicant_name), '') IS NULL
     OR NULLIF(trim(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'registration identity fields required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.institute_registration (
    applicant_user_id,
    applicant_name,
    email,
    phone,
    payload,
    status,
    institute_code,
    institute_type,
    education_board,
    school_email,
    school_phone,
    applicant_username,
    admin_designation,
    country,
    state,
    district,
    city,
    area,
    street,
    landmark,
    pincode,
    website
  ) VALUES (
    p_applicant_user_id,
    trim(p_applicant_name),
    lower(trim(p_email)),
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    COALESCE(p_payload, '{}'::jsonb),
    'pending',
    NULLIF(trim(COALESCE(p_institute_code, '')), ''),
    NULLIF(trim(COALESCE(p_institute_type, '')), ''),
    NULLIF(trim(COALESCE(p_education_board, '')), ''),
    NULLIF(lower(trim(COALESCE(p_school_email, ''))), ''),
    NULLIF(trim(COALESCE(p_school_phone, '')), ''),
    NULLIF(lower(trim(COALESCE(p_applicant_username, ''))), ''),
    NULLIF(trim(COALESCE(p_admin_designation, '')), ''),
    NULLIF(trim(COALESCE(p_country, '')), ''),
    NULLIF(trim(COALESCE(p_state, '')), ''),
    NULLIF(trim(COALESCE(p_district, '')), ''),
    NULLIF(trim(COALESCE(p_city, '')), ''),
    NULLIF(trim(COALESCE(p_area, '')), ''),
    NULLIF(trim(COALESCE(p_street, '')), ''),
    NULLIF(trim(COALESCE(p_landmark, '')), ''),
    NULLIF(trim(COALESCE(p_pincode, '')), ''),
    NULLIF(trim(COALESCE(p_website, '')), '')
  )
  RETURNING * INTO registration;

  PERFORM public._institute_registration_write_legal_consent(
    registration.id,
    p_consent_documents,
    COALESCE(NULLIF(trim(p_consent_action), ''), 'registration_accept'),
    COALESCE(p_accepted_at, now())
  );

  RETURN NEXT registration;
END;
$$;

REVOKE ALL ON FUNCTION public.create_institute_registration_with_legal_consent(
  uuid, text, text, text, jsonb,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text,
  jsonb, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_institute_registration_with_legal_consent(
  uuid, text, text, text, jsonb,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text,
  jsonb, text, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.create_institute_registration_with_legal_consent IS
  'Atomically insert pending institute_registration + legal consent (service_role).';

-- Atomic resubmit: rejected → pending + consent upsert in one transaction.
CREATE OR REPLACE FUNCTION public.resubmit_institute_registration_with_legal_consent(
  p_registration_id uuid,
  p_applicant_user_id uuid,
  p_applicant_name text,
  p_phone text,
  p_payload jsonb,
  p_institute_code text,
  p_institute_type text,
  p_education_board text,
  p_school_email text,
  p_school_phone text,
  p_applicant_username text,
  p_admin_designation text,
  p_country text,
  p_state text,
  p_district text,
  p_city text,
  p_area text,
  p_street text,
  p_landmark text,
  p_pincode text,
  p_website text,
  p_consent_documents jsonb,
  p_accepted_at timestamptz DEFAULT now()
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

  IF registration.applicant_user_id IS DISTINCT FROM p_applicant_user_id THEN
    RAISE EXCEPTION 'registration applicant mismatch'
      USING ERRCODE = '42501';
  END IF;

  IF registration.status <> 'rejected' THEN
    RAISE EXCEPTION 'only rejected registrations can be resubmitted'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.institute_registration
  SET applicant_name = COALESCE(NULLIF(trim(p_applicant_name), ''), applicant_name),
      phone = CASE
        WHEN p_phone IS NULL THEN phone
        ELSE NULLIF(trim(p_phone), '')
      END,
      payload = COALESCE(p_payload, payload),
      status = 'pending',
      rejection_reason = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL,
      institute_id = NULL,
      institute_code = NULLIF(trim(COALESCE(p_institute_code, '')), ''),
      institute_type = NULLIF(trim(COALESCE(p_institute_type, '')), ''),
      education_board = NULLIF(trim(COALESCE(p_education_board, '')), ''),
      school_email = NULLIF(lower(trim(COALESCE(p_school_email, ''))), ''),
      school_phone = NULLIF(trim(COALESCE(p_school_phone, '')), ''),
      applicant_username = NULLIF(lower(trim(COALESCE(p_applicant_username, ''))), ''),
      admin_designation = NULLIF(trim(COALESCE(p_admin_designation, '')), ''),
      country = NULLIF(trim(COALESCE(p_country, '')), ''),
      state = NULLIF(trim(COALESCE(p_state, '')), ''),
      district = NULLIF(trim(COALESCE(p_district, '')), ''),
      city = NULLIF(trim(COALESCE(p_city, '')), ''),
      area = NULLIF(trim(COALESCE(p_area, '')), ''),
      street = NULLIF(trim(COALESCE(p_street, '')), ''),
      landmark = NULLIF(trim(COALESCE(p_landmark, '')), ''),
      pincode = NULLIF(trim(COALESCE(p_pincode, '')), ''),
      website = NULLIF(trim(COALESCE(p_website, '')), '')
  WHERE id = p_registration_id
  RETURNING * INTO registration;

  PERFORM public._institute_registration_write_legal_consent(
    registration.id,
    p_consent_documents,
    'registration_resubmit',
    COALESCE(p_accepted_at, now())
  );

  RETURN NEXT registration;
END;
$$;

REVOKE ALL ON FUNCTION public.resubmit_institute_registration_with_legal_consent(
  uuid, uuid, text, text, jsonb,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text,
  jsonb, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_institute_registration_with_legal_consent(
  uuid, uuid, text, text, jsonb,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text,
  jsonb, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.resubmit_institute_registration_with_legal_consent IS
  'Atomically resubmit rejected registration + legal consent (service_role).';

-- Pending-retry helper: attach/repair consent without creating a second registration.
CREATE OR REPLACE FUNCTION public.upsert_institute_registration_legal_consent(
  p_registration_id uuid,
  p_consent_documents jsonb,
  p_consent_action text DEFAULT 'registration_accept',
  p_accepted_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.institute_registration WHERE id = p_registration_id
  ) THEN
    RAISE EXCEPTION 'registration not found'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM public._institute_registration_write_legal_consent(
    p_registration_id,
    p_consent_documents,
    COALESCE(NULLIF(trim(p_consent_action), ''), 'registration_accept'),
    COALESCE(p_accepted_at, now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_institute_registration_legal_consent(
  uuid, jsonb, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_institute_registration_legal_consent(
  uuid, jsonb, text, timestamptz
) TO service_role;
