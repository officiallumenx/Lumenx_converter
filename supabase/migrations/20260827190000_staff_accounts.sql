-- =============================================================================
-- LumenX Migration 015 — People: staff_account
-- Version: 20260827190000
--
-- Tables (exactly 1):
--   staff_account
--
-- Out of scope:
--   teacher, membership mutations, passwords/invites, staff_attendance,
--   role_permission matrices, careers schema, photo/Storage, demo seeds
--
-- Identity:
--   Separate institute business entity for non-teaching staff directory.
--   Portal login = Auth + user_profile + membership (+ role codes such as
--   accountant / admissions_officer / it_admin / staff).
--   Capabilities live on membership_role — not on this table.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.staff_account (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                    uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id                 uuid NULL REFERENCES public.user_profile (id),

  legacy_code                     text NULL,
  employee_id                     text NULL,

  display_name                    text NOT NULL,
  phone                           text NULL,
  email                           text NULL,
  department                      text NOT NULL,
  job_title                       text NULL,
  date_of_birth                   date NULL,
  joined_on                       date NULL,

  status                          text NOT NULL DEFAULT 'active',

  -- Boundary to future career_application (no FK until Careers schema exists).
  source_career_application_id    uuid NULL,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  deleted_at                      timestamptz NULL,

  CONSTRAINT staff_account_status_check CHECK (
    status IN ('active', 'on_leave', 'pending', 'suspended')
  )
);

CREATE UNIQUE INDEX staff_account_institute_legacy_code_uidx
  ON public.staff_account (institute_id, legacy_code)
  WHERE legacy_code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX staff_account_institute_employee_id_uidx
  ON public.staff_account (institute_id, employee_id)
  WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX staff_account_institute_user_profile_uidx
  ON public.staff_account (institute_id, user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX staff_account_institute_phone_uidx
  ON public.staff_account (institute_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX staff_account_institute_id_idx
  ON public.staff_account (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX staff_account_institute_status_idx
  ON public.staff_account (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX staff_account_user_profile_id_idx
  ON public.staff_account (user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX staff_account_phone_idx
  ON public.staff_account (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER staff_account_set_updated_at
  BEFORE UPDATE ON public.staff_account
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.staff_account IS
  'Institute-owned non-teaching staff directory row. Optional user_profile_id when portal login exists. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.staff_account.source_career_application_id IS
  'Nullable boundary to future career_application. No FK until Careers schema exists.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.staff_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_account_select_scoped
  ON public.staff_account
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR user_profile_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.staff_account FROM anon, authenticated;

GRANT SELECT ON TABLE public.staff_account TO authenticated;

GRANT ALL ON TABLE public.staff_account TO service_role;
