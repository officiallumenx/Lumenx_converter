-- =============================================================================
-- LumenX Migration 007 — Subjects + teacher assignments
-- Version: 20260826194000
--
-- Tables (exactly 3):
--   subject, subject_teacher, teacher_assignment
--
-- Out of scope:
--   subject_offering, class_subject, section_subject, timetable, attendance,
--   exams/marks, homework/diary, homeroom, activity/sports, department,
--   Storage, Auth, demo seeds, teacher.subjects / assigned_section_labels sync
--
-- Model:
--   Institute → subject (persistent catalog)
--   subject ← subject_teacher → teacher          (qualification)
--   teacher_assignment → section × subject × teacher  (placement)
--
-- Hono MUST require an active subject_teacher row before creating an active
-- teacher_assignment (not enforced by DB CHECK — harden later if needed).
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges for postgres-created tables already exclude anon/authenticated
-- automatic DML (Migration 003). This file still REVOKE + explicit GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Teacher composite uniqueness (tenant-safe FKs; no column changes)
-- -----------------------------------------------------------------------------
-- Migration 005 created teacher without UNIQUE (id, institute_id). Student/parent
-- already expose this pattern. Required for subject_teacher / teacher_assignment
-- composite FKs. Does not alter teaching_scope, subjects[], or other columns.

ALTER TABLE public.teacher
  ADD CONSTRAINT teacher_id_institute_key UNIQUE (id, institute_id);

-- -----------------------------------------------------------------------------
-- 1. subject
-- -----------------------------------------------------------------------------
CREATE TABLE public.subject (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),

  name                      text NOT NULL,
  code                      text NOT NULL,
  category                  text NOT NULL,
  periods_per_week          integer NOT NULL,
  applicable_class_codes    text[] NOT NULL,
  status                    text NOT NULL,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT subject_periods_per_week_check CHECK (periods_per_week >= 1),
  CONSTRAINT subject_status_check CHECK (
    status IN ('active', 'draft')
  ),
  -- Enables composite tenant FKs from subject_teacher / teacher_assignment.
  CONSTRAINT subject_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX subject_institute_code_uidx
  ON public.subject (institute_id, code)
  WHERE deleted_at IS NULL;

CREATE INDEX subject_institute_id_idx
  ON public.subject (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX subject_institute_status_idx
  ON public.subject (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER subject_set_updated_at
  BEFORE UPDATE ON public.subject
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.subject IS
  'Institute-persistent subject catalog. Reused across academic years. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.subject.code IS
  'Institute-local subject code (e.g. MTH 101). Unique among non-deleted rows. Name is not unique.';

COMMENT ON COLUMN public.subject.applicable_class_codes IS
  'Class codes this subject applies to (maps Admin grades[] → class.code, e.g. 10, 11). Validated by Hono against assignment class; not an FK.';

COMMENT ON COLUMN public.subject.status IS
  'active | draft.';

-- -----------------------------------------------------------------------------
-- 2. subject_teacher (qualification — not placement)
-- -----------------------------------------------------------------------------
CREATE TABLE public.subject_teacher (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id    uuid NOT NULL,
  subject_id      uuid NOT NULL,
  teacher_id      uuid NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,

  CONSTRAINT subject_teacher_subject_institute_fkey
    FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subject (id, institute_id),

  CONSTRAINT subject_teacher_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE UNIQUE INDEX subject_teacher_subject_teacher_uidx
  ON public.subject_teacher (subject_id, teacher_id)
  WHERE deleted_at IS NULL;

CREATE INDEX subject_teacher_institute_id_idx
  ON public.subject_teacher (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX subject_teacher_subject_id_idx
  ON public.subject_teacher (subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX subject_teacher_teacher_id_idx
  ON public.subject_teacher (teacher_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER subject_teacher_set_updated_at
  BEFORE UPDATE ON public.subject_teacher
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.subject_teacher IS
  'Teacher is qualified for a subject (Admin assignedTeacherIds). Does NOT mean they teach a specific section — that is teacher_assignment.';

-- -----------------------------------------------------------------------------
-- 3. teacher_assignment (placement: teacher × subject × section)
-- -----------------------------------------------------------------------------
CREATE TABLE public.teacher_assignment (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  academic_year_id    uuid NOT NULL,
  class_id            uuid NOT NULL,
  section_id          uuid NOT NULL,
  subject_id          uuid NOT NULL,
  teacher_id          uuid NOT NULL,

  status              text NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT teacher_assignment_status_check CHECK (
    status IN ('active', 'inactive')
  ),

  CONSTRAINT teacher_assignment_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id),

  CONSTRAINT teacher_assignment_subject_institute_fkey
    FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subject (id, institute_id),

  -- Section pins institute + academic year + class.
  CONSTRAINT teacher_assignment_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id)
);

-- One active teacher per subject within a section.
CREATE UNIQUE INDEX teacher_assignment_section_subject_active_uidx
  ON public.teacher_assignment (section_id, subject_id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX teacher_assignment_institute_id_idx
  ON public.teacher_assignment (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_assignment_academic_year_id_idx
  ON public.teacher_assignment (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_assignment_teacher_id_idx
  ON public.teacher_assignment (teacher_id)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_assignment_section_id_idx
  ON public.teacher_assignment (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_assignment_subject_id_idx
  ON public.teacher_assignment (subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX teacher_assignment_section_active_roster_idx
  ON public.teacher_assignment (section_id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE TRIGGER teacher_assignment_set_updated_at
  BEFORE UPDATE ON public.teacher_assignment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.teacher_assignment IS
  'Canonical placement: who teaches which subject in which section. Year/class denormalized for integrity. Hono MUST require subject_teacher qualification before creating an active assignment. Future timetable should prefer teacher_assignment.id. Soft-delete is tombstone; inactive frees active uniqueness.';

COMMENT ON COLUMN public.teacher_assignment.status IS
  'active | inactive. Inactive (or deleted) frees UNIQUE (section_id, subject_id) for a replacement teacher.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses Migration 004 / 001 SECURITY DEFINER helpers.
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- Teachers are institute staff via is_staff_of_institute (includes role teacher).

ALTER TABLE public.subject ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_teacher ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignment ENABLE ROW LEVEL SECURITY;

-- Subject catalog: staff (incl. teachers) / platform; students/parents via
-- enrollment whose class.code is in applicable_class_codes.
CREATE POLICY subject_select_scoped
  ON public.subject
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.enrollment e
        JOIN public.class c ON c.id = e.class_id
        WHERE e.institute_id = subject.institute_id
          AND e.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND c.code = ANY (subject.applicable_class_codes)
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
    )
  );

-- Qualification rows: staff/platform, or the qualified teacher themself.
CREATE POLICY subject_teacher_select_scoped
  ON public.subject_teacher
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.teacher t
        WHERE t.id = subject_teacher.teacher_id
          AND t.institute_id = subject_teacher.institute_id
          AND t.deleted_at IS NULL
          AND t.user_profile_id = auth.uid()
      )
    )
  );

-- Placement: staff/platform; assigned teacher; students/parents on same section.
CREATE POLICY teacher_assignment_select_scoped
  ON public.teacher_assignment
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.teacher t
        WHERE t.id = teacher_assignment.teacher_id
          AND t.institute_id = teacher_assignment.institute_id
          AND t.deleted_at IS NULL
          AND t.user_profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.enrollment e
        WHERE e.section_id = teacher_assignment.section_id
          AND e.institute_id = teacher_assignment.institute_id
          AND e.deleted_at IS NULL
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.subject FROM anon, authenticated;
REVOKE ALL ON TABLE public.subject_teacher FROM anon, authenticated;
REVOKE ALL ON TABLE public.teacher_assignment FROM anon, authenticated;

GRANT SELECT ON TABLE public.subject TO authenticated;
GRANT SELECT ON TABLE public.subject_teacher TO authenticated;
GRANT SELECT ON TABLE public.teacher_assignment TO authenticated;

GRANT ALL ON TABLE public.subject TO service_role;
GRANT ALL ON TABLE public.subject_teacher TO service_role;
GRANT ALL ON TABLE public.teacher_assignment TO service_role;
