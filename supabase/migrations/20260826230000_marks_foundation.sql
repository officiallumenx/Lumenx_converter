-- =============================================================================
-- LumenX Migration 011 — Marks foundation
-- Version: 20260826230000
--
-- Tables (exactly 2):
--   mark_entry
--   mark_score
--
-- Constraint-only ALTERs: none (composite FK targets already exist on
-- academic_year, section, exam, subject, teacher, student, enrollment).
--
-- Out of scope:
--   mark_publication, grade_scheme, report_card, correction_history,
--   homework, diary, notifications, analytics, Storage, Auth, demo seeds
--
-- Model:
--   exam / section / subject / teacher
--        ↓
--   mark_entry (Admin sheet; status workflow)
--        ↓
--   mark_score (per enrollment; nullable marks)
--
-- Learner report cards = derived reads of published entries + scores.
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges hardened by Migration 003; this file still REVOKE + GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. mark_entry
-- -----------------------------------------------------------------------------
CREATE TABLE public.mark_entry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL REFERENCES public.institute (id),
  academic_year_id    uuid NOT NULL,
  class_id            uuid NOT NULL,
  section_id          uuid NOT NULL,
  exam_id             uuid NOT NULL,
  subject_id          uuid NOT NULL,
  teacher_id          uuid NOT NULL,

  max_marks           integer NOT NULL,
  status              text NOT NULL,
  submitted_at        timestamptz NULL,
  published_at        timestamptz NULL,
  admin_note          text NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT mark_entry_status_check CHECK (
    status IN (
      'pending',
      'submitted',
      'published',
      'returned',
      'rejected'
    )
  ),
  CONSTRAINT mark_entry_max_marks_check CHECK (
    max_marks > 0
  ),

  CONSTRAINT mark_entry_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT mark_entry_academic_year_institute_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id),

  CONSTRAINT mark_entry_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id),

  CONSTRAINT mark_entry_exam_year_fkey
    FOREIGN KEY (exam_id, institute_id, academic_year_id)
    REFERENCES public.exam (id, institute_id, academic_year_id),

  CONSTRAINT mark_entry_subject_institute_fkey
    FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subject (id, institute_id),

  CONSTRAINT mark_entry_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

-- One live sheet per exam × section × subject × teacher.
CREATE UNIQUE INDEX mark_entry_exam_section_subject_teacher_uidx
  ON public.mark_entry (exam_id, section_id, subject_id, teacher_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_entry_institute_id_idx
  ON public.mark_entry (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_entry_exam_id_idx
  ON public.mark_entry (exam_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_entry_section_id_idx
  ON public.mark_entry (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_entry_subject_id_idx
  ON public.mark_entry (subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_entry_teacher_id_idx
  ON public.mark_entry (teacher_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_entry_institute_status_idx
  ON public.mark_entry (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER mark_entry_set_updated_at
  BEFORE UPDATE ON public.mark_entry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.mark_entry IS
  'Admin marks sheet: one live row per exam × section × subject × teacher. Status workflow pending→submitted→published|returned|rejected. Learner visibility only when published.';

COMMENT ON COLUMN public.mark_entry.status IS
  'pending | submitted | published | returned | rejected. Publication is status + published_at (no mark_publication table).';

COMMENT ON COLUMN public.mark_entry.max_marks IS
  'Sheet score ceiling. marks <= max_marks and alignment with exam.total_marks are Hono-validated.';

-- -----------------------------------------------------------------------------
-- 2. mark_score
-- -----------------------------------------------------------------------------
CREATE TABLE public.mark_score (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  mark_entry_id       uuid NOT NULL,
  student_id          uuid NOT NULL,
  enrollment_id       uuid NOT NULL,

  marks               integer NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT mark_score_marks_check CHECK (
    marks IS NULL OR marks >= 0
  ),

  CONSTRAINT mark_score_entry_institute_fkey
    FOREIGN KEY (mark_entry_id, institute_id)
    REFERENCES public.mark_entry (id, institute_id),

  CONSTRAINT mark_score_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT mark_score_enrollment_institute_fkey
    FOREIGN KEY (enrollment_id, institute_id)
    REFERENCES public.enrollment (id, institute_id)
);

-- One live score per enrollment per sheet.
CREATE UNIQUE INDEX mark_score_entry_enrollment_uidx
  ON public.mark_score (mark_entry_id, enrollment_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_score_institute_id_idx
  ON public.mark_score (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_score_mark_entry_id_idx
  ON public.mark_score (mark_entry_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_score_student_id_idx
  ON public.mark_score (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_score_enrollment_id_idx
  ON public.mark_score (enrollment_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER mark_score_set_updated_at
  BEFORE UPDATE ON public.mark_score
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.mark_score IS
  'Per-enrollment score on a mark_entry sheet. Single canonical marks value (nullable for partial sheets). enrollment.student_id match and section match are Hono-validated.';

COMMENT ON COLUMN public.mark_score.marks IS
  'Canonical total for the sheet. Connect internal/exam split is not persisted. Upper bound vs max_marks is Hono-only.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses Migration 004 / 001 SECURITY DEFINER helpers.
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- teacher ∈ is_staff_of_institute (existing residual — not changed).
--
-- can_learner_read_mark_entry: SECURITY DEFINER consolidates published +
-- own/guardian score checks and reads mark_entry / mark_score without
-- invoking RLS — avoids entry ↔ score policy recursion while enforcing
-- published-only learner visibility (Phase 3H-2 / 3H-3).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_learner_read_mark_entry(p_mark_entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mark_entry me
    WHERE me.id = p_mark_entry_id
      AND me.deleted_at IS NULL
      AND me.status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.mark_score ms
        WHERE ms.mark_entry_id = me.id
          AND ms.institute_id = me.institute_id
          AND ms.deleted_at IS NULL
          AND (
            public.is_own_student_row(ms.student_id)
            OR public.is_guardian_of_student(ms.student_id)
          )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_mark_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_mark_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_mark_entry(uuid) TO service_role;

ALTER TABLE public.mark_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mark_score ENABLE ROW LEVEL SECURITY;

CREATE POLICY mark_entry_select_scoped
  ON public.mark_entry
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_mark_entry(id)
    )
  );

CREATE POLICY mark_score_select_scoped
  ON public.mark_score
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        public.can_learner_read_mark_entry(mark_entry_id)
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.mark_entry FROM anon, authenticated;
REVOKE ALL ON TABLE public.mark_score FROM anon, authenticated;

GRANT SELECT ON TABLE public.mark_entry TO authenticated;
GRANT SELECT ON TABLE public.mark_score TO authenticated;

GRANT ALL ON TABLE public.mark_entry TO service_role;
GRANT ALL ON TABLE public.mark_score TO service_role;
