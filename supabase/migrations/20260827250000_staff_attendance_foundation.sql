-- =============================================================================
-- LumenX Migration 024 — Staff attendance foundation
-- Version: 20260827250000
--
-- Tables (exactly 1 — step 4.5 / blueprint V1.5):
--   staff_attendance
--
-- Out of scope (defer):
--   staff_account subjects (non-teaching), biometric, sports attendance,
--   leave auto-apply on approve, student attendance_register/mark (separate)
--
-- Model:
--   One row per teacher × attendance_date (faculty self-attendance SoT)
--   day_status draft|submitted mirrors Admin day register lifecycle
--   Teachers read own rows only; admins mark/submit
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.staff_attendance (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  teacher_id              uuid NOT NULL,

  attendance_date         date NOT NULL,
  status                  text NOT NULL,
  check_in                time NULL,
  check_out               time NULL,
  note                    text NULL,

  day_status              text NOT NULL DEFAULT 'draft',
  marked_by_user_id       uuid NOT NULL REFERENCES public.user_profile (id),
  submitted_at            timestamptz NULL,
  submitted_by_user_id    uuid NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT staff_attendance_status_check CHECK (
    status IN ('present', 'late', 'absent', 'leave', 'half-day')
  ),
  CONSTRAINT staff_attendance_day_status_check CHECK (
    day_status IN ('draft', 'submitted')
  ),
  CONSTRAINT staff_attendance_check_in_rule CHECK (
    (status IN ('absent', 'leave') AND check_in IS NULL)
    OR (status IN ('present', 'late', 'half-day'))
  ),
  CONSTRAINT staff_attendance_submit_consistency CHECK (
    (day_status = 'draft' AND submitted_at IS NULL AND submitted_by_user_id IS NULL)
    OR (day_status = 'submitted' AND submitted_at IS NOT NULL AND submitted_by_user_id IS NOT NULL)
  ),

  CONSTRAINT staff_attendance_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT staff_attendance_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE UNIQUE INDEX staff_attendance_teacher_date_live_uidx
  ON public.staff_attendance (institute_id, teacher_id, attendance_date)
  WHERE deleted_at IS NULL;

CREATE INDEX staff_attendance_institute_date_idx
  ON public.staff_attendance (institute_id, attendance_date)
  WHERE deleted_at IS NULL;

CREATE INDEX staff_attendance_teacher_id_idx
  ON public.staff_attendance (teacher_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER staff_attendance_set_updated_at
  BEFORE UPDATE ON public.staff_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.staff_attendance IS
  'Faculty (teacher) daily attendance. Distinct from student attendance_register/mark.';

COMMENT ON COLUMN public.staff_attendance.day_status IS
  'draft | submitted — Admin day register lifecycle; reopen allowed within edit window in Hono.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_attendance_select_scoped
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.teacher t
        WHERE t.id = staff_attendance.teacher_id
          AND t.institute_id = staff_attendance.institute_id
          AND t.user_profile_id = auth.uid()
          AND t.deleted_at IS NULL
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.staff_attendance FROM anon, authenticated;

GRANT SELECT ON TABLE public.staff_attendance TO authenticated;
GRANT ALL ON TABLE public.staff_attendance TO service_role;
