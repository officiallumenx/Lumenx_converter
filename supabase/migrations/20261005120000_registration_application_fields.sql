-- =============================================================================
-- LumenX Migration — Registration application typed fields (Admin 4-step flow)
-- Version: 20261005120000
--
-- Keeps payload jsonb as the full application snapshot, and mirrors key fields
-- into typed columns for Nexus review, uniqueness, and indexing.
-- =============================================================================

ALTER TABLE public.institute_registration
  ADD COLUMN IF NOT EXISTS institute_code text NULL,
  ADD COLUMN IF NOT EXISTS institute_type text NULL,
  ADD COLUMN IF NOT EXISTS education_board text NULL,
  ADD COLUMN IF NOT EXISTS school_email text NULL,
  ADD COLUMN IF NOT EXISTS school_phone text NULL,
  ADD COLUMN IF NOT EXISTS applicant_username text NULL,
  ADD COLUMN IF NOT EXISTS admin_designation text NULL,
  ADD COLUMN IF NOT EXISTS country text NULL,
  ADD COLUMN IF NOT EXISTS state text NULL,
  ADD COLUMN IF NOT EXISTS district text NULL,
  ADD COLUMN IF NOT EXISTS city text NULL,
  ADD COLUMN IF NOT EXISTS area text NULL,
  ADD COLUMN IF NOT EXISTS street text NULL,
  ADD COLUMN IF NOT EXISTS landmark text NULL,
  ADD COLUMN IF NOT EXISTS pincode text NULL,
  ADD COLUMN IF NOT EXISTS website text NULL;

COMMENT ON COLUMN public.institute_registration.institute_code IS
  'Requested unique institute login code (mirrored from payload.instituteCode).';
COMMENT ON COLUMN public.institute_registration.school_email IS
  'Institute office email (not necessarily the Admin applicant email).';
COMMENT ON COLUMN public.institute_registration.applicant_username IS
  'Preferred Admin login username requested at registration.';
COMMENT ON COLUMN public.institute_registration.admin_designation IS
  'Applicant role: Principal or Director.';

-- Backfill from existing payload jsonb (best-effort).
UPDATE public.institute_registration
SET
  institute_code = COALESCE(institute_code, NULLIF(trim(payload->>'instituteCode'), '')),
  institute_type = COALESCE(institute_type, NULLIF(trim(payload->>'instituteType'), '')),
  education_board = COALESCE(education_board, NULLIF(trim(payload->>'educationBoard'), '')),
  school_email = COALESCE(school_email, NULLIF(lower(trim(payload->>'schoolEmail')), '')),
  school_phone = COALESCE(school_phone, NULLIF(trim(payload->>'schoolPhone'), '')),
  applicant_username = COALESCE(applicant_username, NULLIF(lower(trim(payload->>'username')), '')),
  admin_designation = COALESCE(admin_designation, NULLIF(trim(payload->>'principalDesignation'), '')),
  country = COALESCE(country, NULLIF(trim(payload->>'country'), '')),
  state = COALESCE(state, NULLIF(trim(payload->>'state'), '')),
  district = COALESCE(district, NULLIF(trim(payload->>'district'), '')),
  city = COALESCE(city, NULLIF(trim(payload->>'city'), '')),
  area = COALESCE(area, NULLIF(trim(payload->>'area'), '')),
  street = COALESCE(street, NULLIF(trim(payload->>'street'), '')),
  landmark = COALESCE(landmark, NULLIF(trim(payload->>'landmark'), '')),
  pincode = COALESCE(pincode, NULLIF(trim(payload->>'pincode'), '')),
  website = COALESCE(website, NULLIF(trim(payload->>'website'), ''))
WHERE payload IS NOT NULL;

-- One open request may hold a given institute code (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS institute_registration_open_code_lower_uidx
  ON public.institute_registration (lower(institute_code))
  WHERE institute_code IS NOT NULL
    AND status IN ('pending', 'approving');

CREATE INDEX IF NOT EXISTS institute_registration_school_email_lower_idx
  ON public.institute_registration (lower(school_email))
  WHERE school_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS institute_registration_applicant_username_lower_idx
  ON public.institute_registration (lower(applicant_username))
  WHERE applicant_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS institute_registration_city_idx
  ON public.institute_registration (country, state, city)
  WHERE status IN ('pending', 'approving');
