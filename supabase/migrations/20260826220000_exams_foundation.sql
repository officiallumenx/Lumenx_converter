-- =============================================================================
-- LumenX Migration 010 — Exams foundation
-- Version: 20260826220000
--
-- Tables (exactly 3):
--   exam
--   exam_target_section
--   exam_subject_schedule
--
-- Constraint-only ALTERs: none (composite FK targets already exist on
-- academic_year, section, subject, teacher from migrations 006–007).
--
-- Out of scope:
--   marks/results, homework, diary, notifications, Storage, Auth,
--   timetable_slot / teacher_assignment paper links, demo seeds
--
-- Model:
--   exam (header + marks scheme + audience_scope + schedule/lifecycle status)
--        ├── exam_target_section (only when audience_scope = section)
--        └── exam_subject_schedule (one live paper per subject)
--
-- Learner projection = query published exams (no separate publish table).
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges hardened by Migration 003; this file still REVOKE + GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. exam
-- -----------------------------------------------------------------------------
CREATE TABLE public.exam (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  academic_year_id        uuid NOT NULL,

  name                    text NOT NULL,
  header                  text NOT NULL,
  start_date              date NOT NULL,
  end_date                date NOT NULL,
  default_starts_at       time NOT NULL,
  default_ends_at         time NOT NULL,

  total_marks             integer NOT NULL,
  internal_marks          integer NULL,
  external_marks          integer NULL,

  audience_scope          text NOT NULL,
  schedule_status         text NOT NULL,
  lifecycle_status        text NOT NULL,
  schedule_published_at   timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT exam_dates_check CHECK (
    end_date >= start_date
  ),
  CONSTRAINT exam_default_times_check CHECK (
    default_ends_at > default_starts_at
  ),
  CONSTRAINT exam_total_marks_check CHECK (
    total_marks > 0
  ),
  CONSTRAINT exam_internal_marks_check CHECK (
    internal_marks IS NULL
    OR (internal_marks >= 0 AND internal_marks <= total_marks)
  ),
  CONSTRAINT exam_external_marks_check CHECK (
    external_marks IS NULL
    OR (external_marks >= 0 AND external_marks <= total_marks)
  ),
  CONSTRAINT exam_marks_components_sum_check CHECK (
    internal_marks IS NULL
    OR external_marks IS NULL
    OR (internal_marks + external_marks) = total_marks
  ),
  CONSTRAINT exam_audience_scope_check CHECK (
    audience_scope IN ('year', 'section')
  ),
  CONSTRAINT exam_schedule_status_check CHECK (
    schedule_status IN ('draft', 'published')
  ),
  CONSTRAINT exam_lifecycle_status_check CHECK (
    lifecycle_status IN ('open', 'closed')
  ),

  CONSTRAINT exam_id_institute_key UNIQUE (id, institute_id),
  CONSTRAINT exam_id_institute_year_key UNIQUE (id, institute_id, academic_year_id),

  CONSTRAINT exam_academic_year_institute_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id)
);

CREATE INDEX exam_institute_id_idx
  ON public.exam (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_academic_year_id_idx
  ON public.exam (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_institute_schedule_status_idx
  ON public.exam (institute_id, schedule_status)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_institute_lifecycle_status_idx
  ON public.exam (institute_id, lifecycle_status)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_start_date_idx
  ON public.exam (start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_end_date_idx
  ON public.exam (end_date)
  WHERE deleted_at IS NULL;

CREATE TRIGGER exam_set_updated_at
  BEFORE UPDATE ON public.exam
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.exam IS
  'Exam header: year-scoped audience, marks scheme, schedule publication (draft|published), lifecycle (open|closed). Learner schedules are derived reads of published rows.';

COMMENT ON COLUMN public.exam.audience_scope IS
  'year = all sections in academic_year (no exam_target_section rows). section = explicit exam_target_section rows.';

COMMENT ON COLUMN public.exam.schedule_status IS
  'draft | published. Maps Admin ExamTimetable publish/unpublish. Results publication is Marks domain.';

COMMENT ON COLUMN public.exam.lifecycle_status IS
  'open | closed. closed = staff read-only edits (outdated/locked). Soft delete uses deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. exam_target_section
-- -----------------------------------------------------------------------------
CREATE TABLE public.exam_target_section (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  academic_year_id    uuid NOT NULL,
  class_id            uuid NOT NULL,
  exam_id             uuid NOT NULL,
  section_id          uuid NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT exam_target_section_exam_year_fkey
    FOREIGN KEY (exam_id, institute_id, academic_year_id)
    REFERENCES public.exam (id, institute_id, academic_year_id),

  CONSTRAINT exam_target_section_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id)
);

CREATE UNIQUE INDEX exam_target_section_exam_section_uidx
  ON public.exam_target_section (exam_id, section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_target_section_exam_id_idx
  ON public.exam_target_section (exam_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_target_section_section_id_idx
  ON public.exam_target_section (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_target_section_institute_id_idx
  ON public.exam_target_section (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER exam_target_section_set_updated_at
  BEFORE UPDATE ON public.exam_target_section
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.exam_target_section IS
  'Explicit section audience when exam.audience_scope = section. Year-scope exams must have zero live target rows (Hono).';

-- -----------------------------------------------------------------------------
-- 3. exam_subject_schedule
-- -----------------------------------------------------------------------------
CREATE TABLE public.exam_subject_schedule (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL,
  exam_id                   uuid NOT NULL,
  subject_id                uuid NOT NULL,

  paper_date                date NOT NULL,
  starts_at                 time NOT NULL,
  ends_at                   time NOT NULL,
  room                      text NULL,
  invigilator_teacher_id    uuid NULL,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT exam_subject_schedule_times_check CHECK (
    ends_at > starts_at
  ),

  CONSTRAINT exam_subject_schedule_exam_institute_fkey
    FOREIGN KEY (exam_id, institute_id)
    REFERENCES public.exam (id, institute_id),

  CONSTRAINT exam_subject_schedule_subject_institute_fkey
    FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subject (id, institute_id),

  -- NULL invigilator_teacher_id skips FK check (MATCH SIMPLE).
  CONSTRAINT exam_subject_schedule_invigilator_teacher_fkey
    FOREIGN KEY (invigilator_teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE UNIQUE INDEX exam_subject_schedule_exam_subject_uidx
  ON public.exam_subject_schedule (exam_id, subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_subject_schedule_exam_id_idx
  ON public.exam_subject_schedule (exam_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_subject_schedule_subject_id_idx
  ON public.exam_subject_schedule (subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_subject_schedule_exam_paper_date_idx
  ON public.exam_subject_schedule (exam_id, paper_date)
  WHERE deleted_at IS NULL;

CREATE INDEX exam_subject_schedule_invigilator_teacher_id_idx
  ON public.exam_subject_schedule (invigilator_teacher_id)
  WHERE deleted_at IS NULL AND invigilator_teacher_id IS NOT NULL;

CREATE TRIGGER exam_subject_schedule_set_updated_at
  BEFORE UPDATE ON public.exam_subject_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.exam_subject_schedule IS
  'Exam paper slots (subject × date × times). One live row per exam×subject. Invigilator is optional teacher FK, not teacher_assignment.';

COMMENT ON COLUMN public.exam_subject_schedule.invigilator_teacher_id IS
  'Optional invigilator from teacher directory. NULL when unset.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses Migration 004 / 001 SECURITY DEFINER helpers.
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- teacher ∈ is_staff_of_institute (existing residual — not changed).
--
-- can_learner_read_exam: SECURITY DEFINER consolidates published + enrollment
-- audience checks and reads exam / enrollment / exam_target_section without
-- invoking RLS on those tables — avoids exam ↔ target policy recursion while
-- enforcing "child readable iff parent exam readable" (Phase 3G-3 / 3G-5).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_learner_read_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam ex
    WHERE ex.id = p_exam_id
      AND ex.deleted_at IS NULL
      AND ex.schedule_status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.enrollment e
        WHERE e.institute_id = ex.institute_id
          AND e.deleted_at IS NULL
          AND e.status = 'active'
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
          AND (
            (
              ex.audience_scope = 'year'
              AND e.academic_year_id = ex.academic_year_id
            )
            OR (
              ex.audience_scope = 'section'
              AND EXISTS (
                SELECT 1
                FROM public.exam_target_section t
                WHERE t.exam_id = ex.id
                  AND t.institute_id = ex.institute_id
                  AND t.section_id = e.section_id
                  AND t.deleted_at IS NULL
              )
            )
          )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_exam(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_exam(uuid) TO service_role;

ALTER TABLE public.exam ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_target_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subject_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_select_scoped
  ON public.exam
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_exam(id)
    )
  );

CREATE POLICY exam_target_section_select_scoped
  ON public.exam_target_section
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_exam(exam_id)
    )
  );

CREATE POLICY exam_subject_schedule_select_scoped
  ON public.exam_subject_schedule
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_exam(exam_id)
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.exam FROM anon, authenticated;
REVOKE ALL ON TABLE public.exam_target_section FROM anon, authenticated;
REVOKE ALL ON TABLE public.exam_subject_schedule FROM anon, authenticated;

GRANT SELECT ON TABLE public.exam TO authenticated;
GRANT SELECT ON TABLE public.exam_target_section TO authenticated;
GRANT SELECT ON TABLE public.exam_subject_schedule TO authenticated;

GRANT ALL ON TABLE public.exam TO service_role;
GRANT ALL ON TABLE public.exam_target_section TO service_role;
GRANT ALL ON TABLE public.exam_subject_schedule TO service_role;
