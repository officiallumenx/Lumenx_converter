-- =============================================================================
-- LumenX Migration 005 — People: teacher
-- Version: 20260826190000
--
-- Tables (exactly 1):
--   teacher
--
-- Out of scope:
--   staff_account, teacher_assignment, teacher_session, activity_teacher,
--   careers schema, photo/Storage, demo seeds
--
-- Identity:
--   Separate institute business entity with optional user_profile_id.
--   Portal login = Auth + user_profile + membership (+ role teacher).
--
-- Dual-role:
--   teacher.teaching_scope ∈ {subject_teacher, activity_coordinator, dual_role}.
--   TeacherSession.activePortal remains runtime/client state (not persisted here).
--
-- Temporary academics:
--   subjects[] / assigned_section_labels[] until teacher_assignment exists.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. teacher
-- -----------------------------------------------------------------------------
CREATE TABLE public.teacher (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                    uuid NOT NULL REFERENCES public.institute (id),
  user_profile_id                 uuid NULL REFERENCES public.user_profile (id),

  legacy_code                     text NULL,
  employee_id                     text NULL,

  display_name                    text NOT NULL,
  phone                           text NULL,
  email                           text NULL,
  department                      text NOT NULL,
  qualification                   text NULL,
  date_of_birth                   date NULL,
  joined_on                       date NULL,

  teaching_scope                  text NOT NULL,
  portal_access_level             text NOT NULL,
  status                          text NOT NULL DEFAULT 'active',

  -- Temporary denormalized placement until teacher_assignment / academics.
  subjects                        text[] NULL,
  assigned_section_labels         text[] NULL,

  -- Boundary to future career_application (no FK until Careers schema exists).
  source_career_application_id    uuid NULL,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  deleted_at                      timestamptz NULL,

  CONSTRAINT teacher_teaching_scope_check CHECK (
    teaching_scope IN (
      'subject_teacher',
      'activity_coordinator',
      'dual_role'
    )
  ),
  CONSTRAINT teacher_portal_access_level_check CHECK (
    portal_access_level IN (
      'faculty_grading',
      'faculty_only',
      'read_only'
    )
  ),
  CONSTRAINT teacher_status_check CHECK (
    status IN ('active', 'on_leave', 'pending')
  )
);

CREATE UNIQUE INDEX teacher_institute_legacy_code_uidx
  ON public.teacher (institute_id, legacy_code)
  WHERE legacy_code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX teacher_institute_employee_id_uidx
  ON public.teacher (institute_id, employee_id)
  WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX teacher_institute_user_profile_uidx
  ON public.teacher (institute_id, user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

-- Institute-scoped phone uniqueness for Connect phone-login mapping.
-- Not global: the same person may teach at multiple institutes with separate rows.
CREATE UNIQUE INDEX teacher_institute_phone_uidx
  ON public.teacher (institute_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX teacher_institute_id_idx
  ON public.teacher (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_institute_status_idx
  ON public.teacher (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_institute_teaching_scope_idx
  ON public.teacher (institute_id, teaching_scope)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_user_profile_id_idx
  ON public.teacher (user_profile_id)
  WHERE user_profile_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX teacher_phone_idx
  ON public.teacher (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER teacher_set_updated_at
  BEFORE UPDATE ON public.teacher
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.teacher IS
  'Institute-owned faculty / activity coordinator record. Optional user_profile_id when portal login exists. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.teacher.teaching_scope IS
  'Portal capability: subject_teacher | activity_coordinator | dual_role. Maps Admin TeacherRole and Connect TeacherAssignmentType. Class/subject placement is future teacher_assignment.';

COMMENT ON COLUMN public.teacher.portal_access_level IS
  'Admin-controlled Connect write scope: faculty_grading | faculty_only | read_only.';

COMMENT ON COLUMN public.teacher.subjects IS
  'Temporary denormalized subject names until teacher_assignment exists.';

COMMENT ON COLUMN public.teacher.assigned_section_labels IS
  'Temporary denormalized section labels (e.g. 10-A) until teacher_assignment exists.';

COMMENT ON COLUMN public.teacher.source_career_application_id IS
  'Nullable boundary to future career_application. No FK until Careers schema exists.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses public.is_staff_of_institute / public.is_platform_operator from
-- Migration 004 / 001 (SECURITY DEFINER). Staff read = membership + role set,
-- not bare membership — parent/student memberships cannot list the directory.
-- Mutations intentionally omitted for authenticated (Hono + service_role).

ALTER TABLE public.teacher ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_select_scoped
  ON public.teacher
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

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.teacher FROM anon, authenticated;

GRANT SELECT ON TABLE public.teacher TO authenticated;

GRANT ALL ON TABLE public.teacher TO service_role;
