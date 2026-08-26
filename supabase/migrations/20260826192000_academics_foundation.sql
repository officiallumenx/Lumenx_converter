-- =============================================================================
-- LumenX Migration 006 — Academics foundation
-- Version: 20260826192000
--
-- Tables (exactly 4):
--   academic_year, class, section, enrollment
--
-- Out of scope:
--   subject, teacher_assignment, timetable, attendance, exams/marks,
--   homework/diary, promotion/graduation/transfer tables, department,
--   Storage, Auth, demo seeds, student.class_label/section_label/roll_no sync
--
-- Model:
--   Institute → academic_year → class → section → enrollment → student
--
-- Tenant integrity:
--   Composite / triple FKs prevent cross-institute and mismatched year graphs.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges for postgres-created tables already exclude anon/authenticated
-- automatic DML (Migration 003). This file still REVOKE + explicit GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. academic_year
-- -----------------------------------------------------------------------------
CREATE TABLE public.academic_year (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id    uuid NOT NULL REFERENCES public.institute (id),

  name            text NOT NULL,
  code            text NOT NULL,
  starts_on       date NOT NULL,
  ends_on         date NOT NULL,
  status          text NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,

  CONSTRAINT academic_year_dates_check CHECK (ends_on >= starts_on),
  CONSTRAINT academic_year_status_check CHECK (
    status IN ('active', 'completed', 'upcoming', 'archived')
  ),
  -- Enables composite tenant FKs from class / section / enrollment.
  CONSTRAINT academic_year_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX academic_year_institute_code_uidx
  ON public.academic_year (institute_id, code)
  WHERE deleted_at IS NULL;

-- At most one active academic year per institute.
CREATE UNIQUE INDEX academic_year_one_active_per_institute_uidx
  ON public.academic_year (institute_id)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX academic_year_institute_id_idx
  ON public.academic_year (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX academic_year_institute_status_idx
  ON public.academic_year (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX academic_year_institute_dates_idx
  ON public.academic_year (institute_id, starts_on, ends_on)
  WHERE deleted_at IS NULL;

CREATE TRIGGER academic_year_set_updated_at
  BEFORE UPDATE ON public.academic_year
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.academic_year IS
  'Institute academic session. At most one active year per institute. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.academic_year.code IS
  'Institute-local stable code (e.g. 2026-27). Unique among non-deleted rows.';

COMMENT ON COLUMN public.academic_year.status IS
  'active | completed | upcoming | archived. Platform year-lock derives from absence of active.';

-- -----------------------------------------------------------------------------
-- 2. class
-- -----------------------------------------------------------------------------
CREATE TABLE public.class (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  academic_year_id    uuid NOT NULL,

  name                text NOT NULL,
  code                text NOT NULL,
  sort_order          integer NOT NULL DEFAULT 0,
  status              text NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT class_status_check CHECK (
    status IN ('active', 'inactive')
  ),
  CONSTRAINT class_sort_order_check CHECK (sort_order >= 0),

  -- Tenant-safe year ownership.
  CONSTRAINT class_academic_year_institute_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id),

  -- Simple composite for children that only need id + institute.
  CONSTRAINT class_id_institute_key UNIQUE (id, institute_id),

  -- Triple uniqueness for section FK (pins year + institute + class).
  CONSTRAINT class_id_institute_year_key UNIQUE (id, institute_id, academic_year_id)
);

CREATE UNIQUE INDEX class_year_code_uidx
  ON public.class (institute_id, academic_year_id, code)
  WHERE deleted_at IS NULL;

CREATE INDEX class_institute_id_idx
  ON public.class (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX class_academic_year_id_idx
  ON public.class (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX class_academic_year_status_idx
  ON public.class (academic_year_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER class_set_updated_at
  BEFORE UPDATE ON public.class
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.class IS
  'Year-scoped class / grade (Option A). Cloned per academic year. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.class.code IS
  'Canonical short class id for attendance/display (e.g. 10, MPC-FY). Unique per year among non-deleted.';

-- -----------------------------------------------------------------------------
-- 3. section
-- -----------------------------------------------------------------------------
CREATE TABLE public.section (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  academic_year_id    uuid NOT NULL,
  class_id            uuid NOT NULL,

  name                text NOT NULL,
  code                text NOT NULL,
  capacity            integer NULL,
  room                text NULL,
  sort_order          integer NOT NULL DEFAULT 0,
  status              text NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT section_status_check CHECK (
    status IN ('active', 'inactive')
  ),
  CONSTRAINT section_capacity_check CHECK (
    capacity IS NULL OR capacity >= 0
  ),
  CONSTRAINT section_sort_order_check CHECK (sort_order >= 0),

  -- Triple FK: section institute + year must match parent class.
  CONSTRAINT section_class_institute_year_fkey
    FOREIGN KEY (class_id, institute_id, academic_year_id)
    REFERENCES public.class (id, institute_id, academic_year_id),

  CONSTRAINT section_id_institute_key UNIQUE (id, institute_id),

  -- Quadruple uniqueness for enrollment denormalized FKs.
  CONSTRAINT section_id_institute_year_class_key
    UNIQUE (id, institute_id, academic_year_id, class_id)
);

CREATE UNIQUE INDEX section_class_code_uidx
  ON public.section (class_id, code)
  WHERE deleted_at IS NULL;

CREATE INDEX section_institute_id_idx
  ON public.section (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX section_academic_year_id_idx
  ON public.section (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX section_class_id_idx
  ON public.section (class_id)
  WHERE deleted_at IS NULL;

CREATE INDEX section_class_status_idx
  ON public.section (class_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER section_set_updated_at
  BEFORE UPDATE ON public.section
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.section IS
  'Section under a year-scoped class. Capacity/room optional. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.section.code IS
  'Section letter/code (e.g. A, B). Unique per class among non-deleted.';

-- -----------------------------------------------------------------------------
-- 4. enrollment
-- -----------------------------------------------------------------------------
CREATE TABLE public.enrollment (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  academic_year_id    uuid NOT NULL,
  student_id          uuid NOT NULL,
  class_id            uuid NOT NULL,
  section_id          uuid NOT NULL,

  roll_no             text NOT NULL,
  status              text NOT NULL,
  enrolled_on         date NOT NULL,
  withdrawn_on        date NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT enrollment_status_check CHECK (
    status IN (
      'active',
      'completed',
      'transferred',
      'dropped_out',
      'graduated'
    )
  ),
  CONSTRAINT enrollment_withdrawn_on_check CHECK (
    withdrawn_on IS NULL OR withdrawn_on >= enrolled_on
  ),

  -- Student must belong to the same institute.
  CONSTRAINT enrollment_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  -- Section pins institute + year + class; prevents mismatched graphs.
  CONSTRAINT enrollment_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id)
);

-- One enrollment row per student per academic year (history via status, not delete).
CREATE UNIQUE INDEX enrollment_student_year_uidx
  ON public.enrollment (student_id, academic_year_id)
  WHERE deleted_at IS NULL;

-- Active roster roll uniqueness within a section (reusable after leaving active).
CREATE UNIQUE INDEX enrollment_section_active_roll_uidx
  ON public.enrollment (section_id, roll_no)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX enrollment_institute_id_idx
  ON public.enrollment (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX enrollment_academic_year_id_idx
  ON public.enrollment (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX enrollment_student_id_idx
  ON public.enrollment (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX enrollment_student_year_idx
  ON public.enrollment (student_id, academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX enrollment_section_id_idx
  ON public.enrollment (section_id)
  WHERE deleted_at IS NULL;

CREATE INDEX enrollment_section_active_roster_idx
  ON public.enrollment (section_id)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE TRIGGER enrollment_set_updated_at
  BEFORE UPDATE ON public.enrollment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.enrollment IS
  'Canonical student placement for an academic year. One row per student per year. Promotion completes prior row and inserts a new year row. Soft-delete is tombstone only — not used for promotion.';

COMMENT ON COLUMN public.enrollment.roll_no IS
  'Roster roll within section. Unique among active non-deleted enrollments in that section.';

COMMENT ON COLUMN public.enrollment.status IS
  'active | completed | transferred | dropped_out | graduated. completed = promoted/year closed; do not use deleted_at for promotion.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses Migration 004 SECURITY DEFINER helpers:
--   is_staff_of_institute, is_platform_operator, is_own_student_row,
--   is_guardian_of_student
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- Structure (year/class/section): staff/platform, or linked via own/child enrollment.
-- Enrollment: staff/platform, own student row, or guardian of that student.

ALTER TABLE public.academic_year ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment ENABLE ROW LEVEL SECURITY;

CREATE POLICY academic_year_select_scoped
  ON public.academic_year
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
        WHERE e.academic_year_id = academic_year.id
          AND e.institute_id = academic_year.institute_id
          AND e.deleted_at IS NULL
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
    )
  );

CREATE POLICY class_select_scoped
  ON public.class
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
        WHERE e.class_id = class.id
          AND e.institute_id = class.institute_id
          AND e.deleted_at IS NULL
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
    )
  );

CREATE POLICY section_select_scoped
  ON public.section
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
        WHERE e.section_id = section.id
          AND e.institute_id = section.institute_id
          AND e.deleted_at IS NULL
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
    )
  );

CREATE POLICY enrollment_select_scoped
  ON public.enrollment
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.academic_year FROM anon, authenticated;
REVOKE ALL ON TABLE public.class FROM anon, authenticated;
REVOKE ALL ON TABLE public.section FROM anon, authenticated;
REVOKE ALL ON TABLE public.enrollment FROM anon, authenticated;

GRANT SELECT ON TABLE public.academic_year TO authenticated;
GRANT SELECT ON TABLE public.class TO authenticated;
GRANT SELECT ON TABLE public.section TO authenticated;
GRANT SELECT ON TABLE public.enrollment TO authenticated;

GRANT ALL ON TABLE public.academic_year TO service_role;
GRANT ALL ON TABLE public.class TO service_role;
GRANT ALL ON TABLE public.section TO service_role;
GRANT ALL ON TABLE public.enrollment TO service_role;
