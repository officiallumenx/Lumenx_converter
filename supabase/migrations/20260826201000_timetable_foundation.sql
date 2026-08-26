-- =============================================================================
-- LumenX Migration 008 — Timetable foundation
-- Version: 20260826201000
--
-- Tables (exactly 1):
--   timetable_slot
--
-- Constraint-only ALTER:
--   teacher_assignment UNIQUE (id, institute_id, academic_year_id, class_id, section_id)
--   — required for composite tenant FK from timetable_slot (no column changes).
--
-- Out of scope:
--   timetable header, timetable_publication, period/bell tables, term, room entity,
--   breaks, substitutions, attendance, exams/marks, homework/diary, Storage, Auth,
--   demo seeds
--
-- Model:
--   teacher_assignment (canonical teacher×subject×section×year)
--        ↓
--   timetable_slot (day_of_week + teaching period_index + wall times)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Teacher/room double-booking validated in Hono (not DB unique / triggers).
-- Default privileges hardened by Migration 003; this file still REVOKE + GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. teacher_assignment composite uniqueness (tenant-safe FK target)
-- -----------------------------------------------------------------------------
-- Migration 007 created teacher_assignment without UNIQUE covering
-- (id, institute_id, academic_year_id, class_id, section_id). Required so
-- timetable_slot can pin the full graph. id is already PK → composite UNIQUE
-- is valid PostgreSQL and does not change columns or data.

ALTER TABLE public.teacher_assignment
  ADD CONSTRAINT teacher_assignment_id_institute_year_class_section_key
  UNIQUE (id, institute_id, academic_year_id, class_id, section_id);

-- -----------------------------------------------------------------------------
-- 1. timetable_slot
-- -----------------------------------------------------------------------------
CREATE TABLE public.timetable_slot (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL,
  academic_year_id        uuid NOT NULL,
  class_id                uuid NOT NULL,
  section_id              uuid NOT NULL,
  teacher_assignment_id   uuid NOT NULL,

  day_of_week             smallint NOT NULL,
  period_index            integer NOT NULL,
  starts_at               time NOT NULL,
  ends_at                 time NOT NULL,
  room                    text NULL,
  status                  text NOT NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT timetable_slot_day_of_week_check CHECK (
    day_of_week BETWEEN 1 AND 7
  ),
  CONSTRAINT timetable_slot_period_index_check CHECK (
    period_index >= 1
  ),
  CONSTRAINT timetable_slot_times_check CHECK (
    ends_at > starts_at
  ),
  CONSTRAINT timetable_slot_status_check CHECK (
    status IN ('active', 'inactive')
  ),

  -- Canonical assignment pins institute + year + class + section (no separate
  -- teacher_id / subject_id — derive via teacher_assignment).
  CONSTRAINT timetable_slot_assignment_graph_fkey
    FOREIGN KEY (
      teacher_assignment_id,
      institute_id,
      academic_year_id,
      class_id,
      section_id
    )
    REFERENCES public.teacher_assignment (
      id,
      institute_id,
      academic_year_id,
      class_id,
      section_id
    )
);

-- One active teaching slot per section × weekday × teaching period.
CREATE UNIQUE INDEX timetable_slot_section_day_period_active_uidx
  ON public.timetable_slot (section_id, day_of_week, period_index)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX timetable_slot_institute_id_idx
  ON public.timetable_slot (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX timetable_slot_academic_year_id_idx
  ON public.timetable_slot (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX timetable_slot_section_id_idx
  ON public.timetable_slot (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX timetable_slot_teacher_assignment_id_idx
  ON public.timetable_slot (teacher_assignment_id)
  WHERE deleted_at IS NULL;

CREATE INDEX timetable_slot_section_day_idx
  ON public.timetable_slot (section_id, day_of_week)
  WHERE deleted_at IS NULL;

CREATE INDEX timetable_slot_section_active_lookup_idx
  ON public.timetable_slot (section_id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE TRIGGER timetable_slot_set_updated_at
  BEFORE UPDATE ON public.timetable_slot
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.timetable_slot IS
  'Weekly teaching cell for a section. teacher_assignment is canonical for teacher+subject+section+year. Breaks/empty cells are not persisted. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.timetable_slot.day_of_week IS
  'ISO weekday: 1=Monday … 7=Sunday (not active-day grid index).';

COMMENT ON COLUMN public.timetable_slot.period_index IS
  '1-based teaching period ordinal (breaks excluded).';

COMMENT ON COLUMN public.timetable_slot.room IS
  'Optional room override. NULL means consumers use section.room.';

COMMENT ON COLUMN public.timetable_slot.status IS
  'active | inactive. No draft/published publication system in V1.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses existing SECURITY DEFINER helpers. Mutations omitted for authenticated.
-- teacher ∈ is_staff_of_institute (existing residual — not changed here).

ALTER TABLE public.timetable_slot ENABLE ROW LEVEL SECURITY;

CREATE POLICY timetable_slot_select_scoped
  ON public.timetable_slot
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.teacher_assignment ta
        JOIN public.teacher t ON t.id = ta.teacher_id
        WHERE ta.id = timetable_slot.teacher_assignment_id
          AND ta.institute_id = timetable_slot.institute_id
          AND ta.deleted_at IS NULL
          AND t.deleted_at IS NULL
          AND t.user_profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.enrollment e
        WHERE e.section_id = timetable_slot.section_id
          AND e.institute_id = timetable_slot.institute_id
          AND e.deleted_at IS NULL
          AND e.status = 'active'
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
REVOKE ALL ON TABLE public.timetable_slot FROM anon, authenticated;

GRANT SELECT ON TABLE public.timetable_slot TO authenticated;

GRANT ALL ON TABLE public.timetable_slot TO service_role;
