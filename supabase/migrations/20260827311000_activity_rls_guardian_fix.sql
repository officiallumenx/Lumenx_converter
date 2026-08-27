-- =============================================================================
-- LumenX Migration 033 — Activity RLS guardian status fix
-- Version: 20260827311000
--
-- Align membership/achievement SELECT policies with certificates/documents:
-- use is_own_student_row + is_guardian_of_student (active guardian_link only).
-- =============================================================================

DROP POLICY IF EXISTS activity_membership_select_scoped ON public.activity_membership;
DROP POLICY IF EXISTS achievement_select_scoped ON public.achievement;

CREATE POLICY activity_membership_select_scoped
  ON public.activity_membership FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY achievement_select_scoped
  ON public.achievement FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );
