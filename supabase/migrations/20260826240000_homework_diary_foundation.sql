-- =============================================================================
-- LumenX Migration 012 — Homework + Diary foundation
-- Version: 20260826240000
--
-- Tables (exactly 3):
--   homework
--   diary_day
--   diary_day_row
--
-- Constraint-only ALTERs: none (composite FK targets already exist on
-- academic_year, section, subject, teacher).
--
-- Out of scope:
--   homework_completion / homework_submission, attachments / stored_asset,
--   Storage, notifications, comments, activity/audit tables, report_card,
--   grade_scheme, learner diary access, attendance/exams/marks/timetable,
--   demo seeds
--
-- Model:
--   section / subject / teacher
--        ↓
--   homework (kind + publish status; no natural unique grain)
--
--   teacher × date × scope
--        ↓
--   diary_day (submit-to-admin via submitted_at)
--        ↓
--   diary_day_row (multi-section / activity labels per day)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges hardened by Migration 003; this file still REVOKE + GRANT.
-- teacher ∈ is_staff_of_institute (existing residual — not changed).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. homework
-- -----------------------------------------------------------------------------
CREATE TABLE public.homework (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL REFERENCES public.institute (id),
  academic_year_id    uuid NOT NULL,
  class_id            uuid NOT NULL,
  section_id          uuid NOT NULL,
  subject_id          uuid NOT NULL,
  teacher_id          uuid NOT NULL,

  kind                text NOT NULL,
  title               text NOT NULL,
  description         text NOT NULL,
  instructions        text NULL,
  due_date            date NOT NULL,
  status              text NOT NULL,
  published_at        timestamptz NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT homework_kind_check CHECK (
    kind IN ('homework', 'assignment')
  ),
  CONSTRAINT homework_status_check CHECK (
    status IN ('draft', 'published', 'expired')
  ),

  CONSTRAINT homework_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT homework_academic_year_institute_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id),

  CONSTRAINT homework_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id),

  CONSTRAINT homework_subject_institute_fkey
    FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subject (id, institute_id),

  CONSTRAINT homework_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

-- No content-based live unique: multiple items may share teacher/section/subject/due.

CREATE INDEX homework_institute_id_idx
  ON public.homework (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_academic_year_id_idx
  ON public.homework (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_section_id_idx
  ON public.homework (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_subject_id_idx
  ON public.homework (subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_teacher_id_idx
  ON public.homework (teacher_id)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_due_date_idx
  ON public.homework (due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX homework_institute_status_idx
  ON public.homework (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER homework_set_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.homework IS
  'Teacher homework/assignment item for one section. Status draft|published|expired on the row (no publication table). Learner visibility only when published.';

COMMENT ON COLUMN public.homework.kind IS
  'homework | assignment — single durable table for both Connect types.';

COMMENT ON COLUMN public.homework.status IS
  'draft | published | expired. published_at set by Hono on publish; expiry is stored status (not derived from due_date).';

COMMENT ON COLUMN public.homework.due_date IS
  'Calendar due date (content only; not part of identity).';

-- -----------------------------------------------------------------------------
-- 2. diary_day
-- -----------------------------------------------------------------------------
CREATE TABLE public.diary_day (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL REFERENCES public.institute (id),
  academic_year_id    uuid NULL,
  teacher_id          uuid NOT NULL,

  diary_date          date NOT NULL,
  scope               text NOT NULL,
  submitted_at        timestamptz NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT diary_day_scope_check CHECK (
    scope IN ('subject', 'activity')
  ),

  CONSTRAINT diary_day_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT diary_day_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id),

  -- Nullable academic_year_id: when NULL, PostgreSQL skips this FK check.
  CONSTRAINT diary_day_academic_year_institute_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id)
);

-- One live diary day per institute × teacher × calendar date × scope.
CREATE UNIQUE INDEX diary_day_institute_teacher_date_scope_uidx
  ON public.diary_day (institute_id, teacher_id, diary_date, scope)
  WHERE deleted_at IS NULL;

CREATE INDEX diary_day_institute_id_idx
  ON public.diary_day (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX diary_day_institute_submitted_at_idx
  ON public.diary_day (institute_id, submitted_at)
  WHERE deleted_at IS NULL;

CREATE TRIGGER diary_day_set_updated_at
  BEFORE UPDATE ON public.diary_day
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.diary_day IS
  'Teacher diary book day: subject or activity scope. Sections live on diary_day_row. submitted_at NULL = not submitted to Admin.';

COMMENT ON COLUMN public.diary_day.scope IS
  'subject | activity. Seed class-teacher maps to subject at cutover.';

COMMENT ON COLUMN public.diary_day.submitted_at IS
  'Set when submitted to principal/Admin. Re-submit updates the same live day.';

COMMENT ON COLUMN public.diary_day.academic_year_id IS
  'Optional year context; NULL skips year FK. Hono may set from active year / row sections.';

-- -----------------------------------------------------------------------------
-- 3. diary_day_row
-- -----------------------------------------------------------------------------
CREATE TABLE public.diary_day_row (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  diary_day_id        uuid NOT NULL,
  section_id          uuid NULL,

  class_label         text NOT NULL,
  description         text NOT NULL,
  sort_order          integer NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT diary_day_row_sort_order_check CHECK (
    sort_order >= 0
  ),

  CONSTRAINT diary_day_row_day_institute_fkey
    FOREIGN KEY (diary_day_id, institute_id)
    REFERENCES public.diary_day (id, institute_id),

  -- Nullable section_id: when NULL, PostgreSQL skips this FK check (activity labels).
  CONSTRAINT diary_day_row_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.section (id, institute_id)
);

-- At most one live row per day × section when section is set.
CREATE UNIQUE INDEX diary_day_row_day_section_uidx
  ON public.diary_day_row (diary_day_id, section_id)
  WHERE deleted_at IS NULL
    AND section_id IS NOT NULL;

CREATE INDEX diary_day_row_diary_day_id_idx
  ON public.diary_day_row (diary_day_id)
  WHERE deleted_at IS NULL;

CREATE INDEX diary_day_row_institute_id_idx
  ON public.diary_day_row (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX diary_day_row_section_id_idx
  ON public.diary_day_row (section_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER diary_day_row_set_updated_at
  BEFORE UPDATE ON public.diary_day_row
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.diary_day_row IS
  'Per-class/activity line on a diary_day. scope=subject → Hono requires section_id; scope=activity may use class_label only.';

COMMENT ON COLUMN public.diary_day_row.section_id IS
  'Academic section when known. NULL allowed for activity free-text labels.';

COMMENT ON COLUMN public.diary_day_row.class_label IS
  'Display label (e.g. 10-A or U14 Football). Always stored.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses Migration 004 / 001 SECURITY DEFINER helpers.
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- teacher ∈ is_staff_of_institute (existing residual — not changed).
--
-- can_learner_read_homework: SECURITY DEFINER consolidates published +
-- own/guardian enrollment-in-section checks and reads homework / enrollment
-- without invoking RLS — avoids policy recursion while enforcing
-- published-only learner visibility (Phase 3I-2 / 3I-3).
-- Diary: staff/platform only (no learner/parent SELECT).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_learner_read_homework(p_homework_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.homework h
    WHERE h.id = p_homework_id
      AND h.deleted_at IS NULL
      AND h.status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.enrollment e
        WHERE e.institute_id = h.institute_id
          AND e.section_id = h.section_id
          AND e.deleted_at IS NULL
          AND e.status = 'active'
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_homework(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_homework(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_homework(uuid) TO service_role;

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_day_row ENABLE ROW LEVEL SECURITY;

CREATE POLICY homework_select_scoped
  ON public.homework
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_homework(id)
    )
  );

CREATE POLICY diary_day_select_scoped
  ON public.diary_day
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

CREATE POLICY diary_day_row_select_scoped
  ON public.diary_day_row
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.homework FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.diary_day FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.diary_day_row FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE public.homework TO authenticated;
GRANT SELECT ON TABLE public.diary_day TO authenticated;
GRANT SELECT ON TABLE public.diary_day_row TO authenticated;

GRANT ALL ON TABLE public.homework TO service_role;
GRANT ALL ON TABLE public.diary_day TO service_role;
GRANT ALL ON TABLE public.diary_day_row TO service_role;
