-- =============================================================================
-- LumenX Migration 009 — Attendance foundation
-- Version: 20260826210000
--
-- Tables (exactly 3):
--   attendance_config_version
--   attendance_register
--   attendance_mark
--
-- Constraint-only ALTERs (no column changes):
--   enrollment UNIQUE (id, institute_id)
--   timetable_slot UNIQUE (id, institute_id, academic_year_id, class_id, section_id)
--
-- Out of scope:
--   staff attendance, sports attendance, holidays, leave module, biometric,
--   notification tables, correction history, exams/marks, homework/diary,
--   period catalog, Storage, Auth, demo seeds
--
-- Model:
--   attendance_config_version (append-only Effective From policy)
--        ↓
--   attendance_register (section × date × slot_code; draft|submitted)
--        ↓
--   attendance_mark (enrollment × status: present|absent|leave)
--
-- period_wise sessions optionally link timetable_slot (Migration 008).
-- Daily / morning / afternoon sessions do not require a timetable_slot.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges hardened by Migration 003; this file still REVOKE + GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Composite uniqueness for tenant-safe FKs (constraint-only)
-- -----------------------------------------------------------------------------
ALTER TABLE public.enrollment
  ADD CONSTRAINT enrollment_id_institute_key UNIQUE (id, institute_id);

ALTER TABLE public.timetable_slot
  ADD CONSTRAINT timetable_slot_id_institute_year_class_section_key
  UNIQUE (id, institute_id, academic_year_id, class_id, section_id);

-- -----------------------------------------------------------------------------
-- 1. attendance_config_version
-- -----------------------------------------------------------------------------
CREATE TABLE public.attendance_config_version (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                  uuid NOT NULL REFERENCES public.institute (id),

  effective_from                date NOT NULL,
  method                        text NOT NULL,
  owner                         text NOT NULL,
  scope                         text NOT NULL,
  class_codes                   text[] NOT NULL DEFAULT '{}',
  section_codes                 text[] NOT NULL DEFAULT '{}',
  created_by_user_profile_id    uuid NULL REFERENCES public.user_profile (id),

  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  deleted_at                    timestamptz NULL,

  CONSTRAINT attendance_config_version_method_check CHECK (
    method IN (
      'daily',
      'morning_first_period',
      'morning_afternoon',
      'period_wise'
    )
  ),
  CONSTRAINT attendance_config_version_owner_check CHECK (
    owner IN (
      'class_teacher',
      'current_period_teacher',
      'attendance_incharge'
    )
  ),
  CONSTRAINT attendance_config_version_scope_check CHECK (
    scope IN ('institute', 'class', 'section')
  ),

  CONSTRAINT attendance_config_version_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX attendance_config_version_institute_id_idx
  ON public.attendance_config_version (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_config_version_institute_effective_idx
  ON public.attendance_config_version (institute_id, effective_from DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER attendance_config_version_set_updated_at
  BEFORE UPDATE ON public.attendance_config_version
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.attendance_config_version IS
  'Append-only Effective From attendance policy versions (method + Taken By + scope). Past versions are not rewritten; registers freeze config_version_id.';

COMMENT ON COLUMN public.attendance_config_version.class_codes IS
  'Class code targets when scope=class (empty = all). Maps Admin classTargets.';

COMMENT ON COLUMN public.attendance_config_version.section_codes IS
  'Section code targets when scope=section (empty = all). Maps Admin sectionTargets.';

-- -----------------------------------------------------------------------------
-- 2. attendance_register
-- -----------------------------------------------------------------------------
CREATE TABLE public.attendance_register (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL,
  academic_year_id        uuid NOT NULL,
  class_id                uuid NOT NULL,
  section_id              uuid NOT NULL,
  config_version_id       uuid NOT NULL,

  method                  text NOT NULL,
  owner                   text NOT NULL,
  attendance_date         date NOT NULL,
  slot_kind               text NOT NULL,
  slot_code               text NOT NULL,
  period_index            integer NULL,
  timetable_slot_id       uuid NULL,
  slot_label              text NOT NULL,
  subject_label           text NULL,
  starts_at               time NULL,
  ends_at                 time NULL,

  status                  text NOT NULL,
  marked_by_teacher_id    uuid NULL,
  submitted_at            timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT attendance_register_method_check CHECK (
    method IN (
      'daily',
      'morning_first_period',
      'morning_afternoon',
      'period_wise'
    )
  ),
  CONSTRAINT attendance_register_owner_check CHECK (
    owner IN (
      'class_teacher',
      'current_period_teacher',
      'attendance_incharge'
    )
  ),
  CONSTRAINT attendance_register_slot_kind_check CHECK (
    slot_kind IN ('day', 'morning', 'afternoon', 'period')
  ),
  CONSTRAINT attendance_register_status_check CHECK (
    status IN ('draft', 'submitted')
  ),
  -- Allows engine 0-based indices; timetable_slot remains 1-based (Hono maps).
  CONSTRAINT attendance_register_period_index_check CHECK (
    period_index IS NULL OR period_index >= 0
  ),
  CONSTRAINT attendance_register_times_check CHECK (
    starts_at IS NULL
    OR ends_at IS NULL
    OR ends_at > starts_at
  ),
  -- period_wise cells require period_index; morning_first may optionally store one.
  CONSTRAINT attendance_register_slot_period_consistency_check CHECK (
    slot_kind <> 'period' OR period_index IS NOT NULL
  ),

  CONSTRAINT attendance_register_id_institute_key UNIQUE (id, institute_id),

  -- Section pins institute + academic year + class.
  CONSTRAINT attendance_register_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id),

  CONSTRAINT attendance_register_config_institute_fkey
    FOREIGN KEY (config_version_id, institute_id)
    REFERENCES public.attendance_config_version (id, institute_id),

  -- Optional period_wise link to Migration 008; NULL for daily / morning sessions.
  CONSTRAINT attendance_register_timetable_slot_graph_fkey
    FOREIGN KEY (
      timetable_slot_id,
      institute_id,
      academic_year_id,
      class_id,
      section_id
    )
    REFERENCES public.timetable_slot (
      id,
      institute_id,
      academic_year_id,
      class_id,
      section_id
    ),

  CONSTRAINT attendance_register_marked_by_teacher_fkey
    FOREIGN KEY (marked_by_teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

-- One register per section × date × slot (engine registerKey).
CREATE UNIQUE INDEX attendance_register_section_date_slot_uidx
  ON public.attendance_register (section_id, attendance_date, slot_code)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_register_institute_id_idx
  ON public.attendance_register (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_register_section_date_idx
  ON public.attendance_register (section_id, attendance_date)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_register_academic_year_id_idx
  ON public.attendance_register (academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_register_config_version_id_idx
  ON public.attendance_register (config_version_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_register_timetable_slot_id_idx
  ON public.attendance_register (timetable_slot_id)
  WHERE deleted_at IS NULL AND timetable_slot_id IS NOT NULL;

CREATE INDEX attendance_register_status_idx
  ON public.attendance_register (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER attendance_register_set_updated_at
  BEFORE UPDATE ON public.attendance_register
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.attendance_register IS
  'Attendance session for a section on a date and slot_code. method/owner/config_version_id freeze after first write (Hono). period_wise may reference timetable_slot.';

COMMENT ON COLUMN public.attendance_register.slot_code IS
  'Stable slot id within the day, e.g. slot:day, slot:morning, slot:afternoon, slot:period:1.';

COMMENT ON COLUMN public.attendance_register.timetable_slot_id IS
  'Optional FK to timetable_slot for period_wise teaching cells. NULL for daily/morning/afternoon synthetic slots.';

COMMENT ON COLUMN public.attendance_register.status IS
  'draft | submitted. No separate published state in V1.';

-- -----------------------------------------------------------------------------
-- 3. attendance_mark
-- -----------------------------------------------------------------------------
CREATE TABLE public.attendance_mark (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  register_id         uuid NOT NULL,
  student_id          uuid NOT NULL,
  enrollment_id       uuid NOT NULL,

  status              text NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT attendance_mark_status_check CHECK (
    status IN ('present', 'absent', 'leave')
  ),

  -- Register pins institute.
  CONSTRAINT attendance_mark_register_institute_fkey
    FOREIGN KEY (register_id, institute_id)
    REFERENCES public.attendance_register (id, institute_id),

  CONSTRAINT attendance_mark_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT attendance_mark_enrollment_institute_fkey
    FOREIGN KEY (enrollment_id, institute_id)
    REFERENCES public.enrollment (id, institute_id)
);

-- One mark per enrollment per register (idempotent upsert target).
CREATE UNIQUE INDEX attendance_mark_register_enrollment_uidx
  ON public.attendance_mark (register_id, enrollment_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_mark_institute_id_idx
  ON public.attendance_mark (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_mark_student_id_idx
  ON public.attendance_mark (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_mark_enrollment_id_idx
  ON public.attendance_mark (enrollment_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_mark_register_id_idx
  ON public.attendance_mark (register_id)
  WHERE deleted_at IS NULL;

CREATE INDEX attendance_mark_register_status_idx
  ON public.attendance_mark (register_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER attendance_mark_set_updated_at
  BEFORE UPDATE ON public.attendance_mark
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.attendance_mark IS
  'Per-enrollment attendance fact for a register. enrollment_id preserves year/section history; student_id is durable identity. status = present|absent|leave (no late/excused in V1).';

COMMENT ON COLUMN public.attendance_mark.enrollment_id IS
  'Canonical learner placement for the attendance date''s academic year. Hono must ensure enrollment.section_id matches register.section_id.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Reuses Migration 004 / 001 SECURITY DEFINER helpers.
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- teacher ∈ is_staff_of_institute (existing residual — not changed).

ALTER TABLE public.attendance_config_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_mark ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_config_version_select_scoped
  ON public.attendance_config_version
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

CREATE POLICY attendance_register_select_scoped
  ON public.attendance_register
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
        WHERE e.section_id = attendance_register.section_id
          AND e.institute_id = attendance_register.institute_id
          AND e.deleted_at IS NULL
          AND e.status = 'active'
          AND (
            public.is_own_student_row(e.student_id)
            OR public.is_guardian_of_student(e.student_id)
          )
      )
    )
  );

CREATE POLICY attendance_mark_select_scoped
  ON public.attendance_mark
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
REVOKE ALL ON TABLE public.attendance_config_version FROM anon, authenticated;
REVOKE ALL ON TABLE public.attendance_register FROM anon, authenticated;
REVOKE ALL ON TABLE public.attendance_mark FROM anon, authenticated;

GRANT SELECT ON TABLE public.attendance_config_version TO authenticated;
GRANT SELECT ON TABLE public.attendance_register TO authenticated;
GRANT SELECT ON TABLE public.attendance_mark TO authenticated;

GRANT ALL ON TABLE public.attendance_config_version TO service_role;
GRANT ALL ON TABLE public.attendance_register TO service_role;
GRANT ALL ON TABLE public.attendance_mark TO service_role;
