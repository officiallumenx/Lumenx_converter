-- =============================================================================
-- LumenX Migration 025 — Staff attendance RLS harden
-- Version: 20260827251000
--
-- Fixes medium finding from step 4.5 security review:
--   Teachers must not SELECT other teachers' staff_attendance via PostgREST.
--   Align RLS with Hono canReadInstituteWide / own-teacher logic.
-- =============================================================================

DROP POLICY IF EXISTS staff_attendance_select_scoped ON public.staff_attendance;

CREATE POLICY staff_attendance_select_scoped
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.has_institute_role(
        institute_id,
        'institute_admin',
        'principal',
        'vice_principal',
        'coordinator',
        'it_admin',
        'accountant',
        'admissions_officer',
        'staff'
      )
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

COMMENT ON POLICY staff_attendance_select_scoped ON public.staff_attendance IS
  'Wide staff roles read institute-wide; teachers read own rows only.';
