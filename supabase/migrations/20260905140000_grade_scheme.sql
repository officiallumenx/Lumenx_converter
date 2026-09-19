-- =============================================================================
-- LumenX Migration — grade_scheme
-- Version: 20260905140000
--
-- Tables (1):
--   grade_scheme
--
-- Model:
--   grade_scheme — per-institute letter/grade band configuration.
--   Bands stored as JSONB array: [{"min":90,"max":100,"grade":"A+","gpa":4.0}]
--   Optional academic_year_id scoping; is_default partial unique per institute.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. grade_scheme
-- -----------------------------------------------------------------------------
CREATE TABLE public.grade_scheme (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  name                    text NOT NULL,
  academic_year_id        uuid NULL,
  is_default              boolean NOT NULL DEFAULT false,
  bands                   jsonb NOT NULL,
  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT grade_scheme_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT grade_scheme_bands_array_check CHECK (jsonb_typeof(bands) = 'array'),

  CONSTRAINT grade_scheme_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT grade_scheme_academic_year_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id)
);

-- Only one live default per institute.
CREATE UNIQUE INDEX grade_scheme_institute_default_uidx
  ON public.grade_scheme (institute_id)
  WHERE is_default = true AND deleted_at IS NULL;

CREATE INDEX grade_scheme_institute_idx
  ON public.grade_scheme (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER grade_scheme_set_updated_at
  BEFORE UPDATE ON public.grade_scheme
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.grade_scheme IS 'Grade/letter band configuration per institute. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.grade_scheme ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.grade_scheme FROM anon, authenticated;
GRANT SELECT ON public.grade_scheme TO authenticated;

CREATE POLICY grade_scheme_staff_select
  ON public.grade_scheme FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_staff_of_institute(institute_id)
  );

CREATE POLICY grade_scheme_member_select
  ON public.grade_scheme FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_institute_member(institute_id)
  );

CREATE POLICY grade_scheme_service_all
  ON public.grade_scheme FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
