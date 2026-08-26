-- =============================================================================
-- LumenX Migration 004 — People: students + parents + guardian links
-- Version: 20260826184800
--
-- Tables (exactly 3):
--   student, parent, guardian_link
--
-- Out of scope:
--   admissions, attendance, classes/sections/enrollment, id_card, documents,
--   storage buckets, demo seeds, teacher/staff_account
--
-- Identity:
--   student/parent are institute business entities with optional user_profile_id.
--   Portal login = Auth + user_profile + membership (+ role student|parent).
--
-- Photo:
--   student.photo_asset_path = private Storage object key (no binary in DB).
--   Bucket/upload APIs are a later phase. Public /verify must not auto-expose photos.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges for postgres-created tables already exclude anon/authenticated
-- automatic DML (Migration 003). This file still REVOKE + explicit GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. student
-- -----------------------------------------------------------------------------
CREATE TABLE public.student (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                      uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id                   uuid NULL REFERENCES public.user_profile (id),

  legacy_code                       text NULL,
  admission_number                  text NULL,
  source_admission_application_id   uuid NULL,

  first_name                        text NOT NULL,
  surname                           text NOT NULL,
  display_name                      text NOT NULL,
  gender                            text NOT NULL,
  date_of_birth                     date NULL,
  address                           text NOT NULL,

  -- Temporary denormalized academic placement (until enrollment/class/section).
  class_label                       text NULL,
  section_label                     text NULL,
  roll_no                           text NULL,

  status                            text NOT NULL DEFAULT 'active',
  access_status                     text NOT NULL DEFAULT 'active',

  blood_group                       text NULL,
  emergency_contact                 text NULL,
  house                             text NULL,

  -- Private Storage object key (not a public URL; no binary in Postgres).
  photo_asset_path                  text NULL,

  id_card_issued_on                 date NULL,
  id_card_valid_till                date NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),
  deleted_at                        timestamptz NULL,

  CONSTRAINT student_gender_check CHECK (
    gender IN ('female', 'male', 'other', 'prefer_not_to_say')
  ),
  CONSTRAINT student_status_check CHECK (
    status IN ('active', 'at-risk', 'watch', 'inactive', 'graduated')
  ),
  CONSTRAINT student_access_status_check CHECK (
    access_status IN ('active', 'hold', 'suspended')
  ),
  -- Enables composite tenant FKs from guardian_link.
  CONSTRAINT student_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX student_institute_legacy_code_uidx
  ON public.student (institute_id, legacy_code)
  WHERE legacy_code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX student_institute_admission_number_uidx
  ON public.student (institute_id, admission_number)
  WHERE admission_number IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX student_institute_user_profile_uidx
  ON public.student (institute_id, user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX student_institute_id_idx
  ON public.student (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX student_institute_status_idx
  ON public.student (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX student_user_profile_id_idx
  ON public.student (user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX student_institute_roll_idx
  ON public.student (institute_id, class_label, section_label, roll_no)
  WHERE deleted_at IS NULL;

CREATE TRIGGER student_set_updated_at
  BEFORE UPDATE ON public.student
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.student IS
  'Institute-owned learner record. Optional user_profile_id when portal login exists. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.student.photo_asset_path IS
  'Private Supabase Storage object key for profile photo (e.g. institutes/{institute_id}/students/{student_id}/profile-photo/{uuid}.jpg). Not a public URL. Bucket/wiring is a later phase.';

COMMENT ON COLUMN public.student.class_label IS
  'Temporary denormalized class label until enrollment/class tables exist.';

COMMENT ON COLUMN public.student.section_label IS
  'Temporary denormalized section label until enrollment/class tables exist.';

COMMENT ON COLUMN public.student.roll_no IS
  'Temporary denormalized roll number; attendance engine currently keys stu:{class}:{section}:{roll}.';

COMMENT ON COLUMN public.student.source_admission_application_id IS
  'Nullable boundary to future admission_application. No FK until Admissions schema exists. Terminal convert state = approved.';

-- -----------------------------------------------------------------------------
-- 2. parent
-- -----------------------------------------------------------------------------
CREATE TABLE public.parent (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id    uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id uuid NULL REFERENCES public.user_profile (id),

  legacy_code     text NULL,
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text NULL,
  address         text NULL,

  invite_status   text NOT NULL DEFAULT 'pending',
  access_status   text NOT NULL DEFAULT 'active',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,

  CONSTRAINT parent_invite_status_check CHECK (
    invite_status IN ('pending', 'active')
  ),
  CONSTRAINT parent_access_status_check CHECK (
    access_status IN ('active', 'hold', 'suspended')
  ),
  CONSTRAINT parent_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX parent_institute_legacy_code_uidx
  ON public.parent (institute_id, legacy_code)
  WHERE legacy_code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX parent_institute_phone_uidx
  ON public.parent (institute_id, phone)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX parent_institute_user_profile_uidx
  ON public.parent (institute_id, user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX parent_institute_id_idx
  ON public.parent (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX parent_user_profile_id_idx
  ON public.parent (user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER parent_set_updated_at
  BEFORE UPDATE ON public.parent
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.parent IS
  'Institute-owned guardian record. Optional user_profile_id when portal login exists. Passwords live in Auth only.';

-- -----------------------------------------------------------------------------
-- 3. guardian_link
-- -----------------------------------------------------------------------------
CREATE TABLE public.guardian_link (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id          uuid NOT NULL REFERENCES public.institute (id),
  student_id            uuid NOT NULL,
  parent_id             uuid NOT NULL,
  relationship          text NOT NULL,
  is_primary            boolean NOT NULL DEFAULT false,
  is_emergency_contact  boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'active',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,

  CONSTRAINT guardian_link_relationship_check CHECK (
    relationship IN ('mother', 'father', 'guardian')
  ),
  CONSTRAINT guardian_link_status_check CHECK (
    status IN ('active', 'inactive')
  ),

  -- Tenant integrity: student and parent must belong to the same institute as the link.
  CONSTRAINT guardian_link_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),
  CONSTRAINT guardian_link_parent_institute_fkey
    FOREIGN KEY (parent_id, institute_id)
    REFERENCES public.parent (id, institute_id)
);

CREATE UNIQUE INDEX guardian_link_student_parent_uidx
  ON public.guardian_link (student_id, parent_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX guardian_link_one_primary_per_student_uidx
  ON public.guardian_link (student_id)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE INDEX guardian_link_institute_id_idx
  ON public.guardian_link (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX guardian_link_parent_id_idx
  ON public.guardian_link (parent_id)
  WHERE deleted_at IS NULL;

CREATE INDEX guardian_link_student_id_idx
  ON public.guardian_link (student_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER guardian_link_set_updated_at
  BEFORE UPDATE ON public.guardian_link
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.guardian_link IS
  'Institute-scoped student↔parent relationship. Composite FKs enforce same-institute integrity.';

-- =============================================================================
-- RLS helpers (SECURITY DEFINER — avoid policy recursion across people tables)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_staff_of_institute(p_institute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_institute_role(
    p_institute_id,
    'institute_admin',
    'principal',
    'vice_principal',
    'coordinator',
    'teacher',
    'accountant',
    'admissions_officer',
    'it_admin',
    'staff'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_guardian_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guardian_link gl
    JOIN public.parent p ON p.id = gl.parent_id
    WHERE gl.student_id = p_student_id
      AND gl.deleted_at IS NULL
      AND gl.status = 'active'
      AND p.deleted_at IS NULL
      AND p.user_profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_student_row(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student s
    WHERE s.id = p_student_id
      AND s.deleted_at IS NULL
      AND s.user_profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_parent_row(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent p
    WHERE p.id = p_parent_id
      AND p.deleted_at IS NULL
      AND p.user_profile_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_of_institute(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_guardian_of_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_own_student_row(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_own_parent_row(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_staff_of_institute(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_guardian_of_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_student_row(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_parent_row(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_staff_of_institute(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_guardian_of_student(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_own_student_row(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_own_parent_row(uuid) TO service_role;

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- Staff read uses staff roles only — not bare membership — so parent/student
-- memberships cannot list the whole institute directory.

ALTER TABLE public.student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_select_scoped
  ON public.student
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR user_profile_id = auth.uid()
      OR public.is_guardian_of_student(id)
    )
  );

CREATE POLICY parent_select_scoped
  ON public.parent
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

CREATE POLICY guardian_link_select_scoped
  ON public.guardian_link
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.is_own_parent_row(parent_id)
      OR public.is_own_student_row(student_id)
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.student FROM anon, authenticated;
REVOKE ALL ON TABLE public.parent FROM anon, authenticated;
REVOKE ALL ON TABLE public.guardian_link FROM anon, authenticated;

GRANT SELECT ON TABLE public.student TO authenticated;
GRANT SELECT ON TABLE public.parent TO authenticated;
GRANT SELECT ON TABLE public.guardian_link TO authenticated;

GRANT ALL ON TABLE public.student TO service_role;
GRANT ALL ON TABLE public.parent TO service_role;
GRANT ALL ON TABLE public.guardian_link TO service_role;
