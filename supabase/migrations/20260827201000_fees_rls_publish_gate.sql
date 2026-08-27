-- =============================================================================
-- LumenX Migration 017 — Fees RLS: publish gate for learner reads
-- Version: 20260827201000
--
-- Tightens concession / student_fee / fee_payment SELECT for parents/students
-- so draft (unpublished) fee plans are not readable via direct PostgREST.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_learner_read_fee_plan(p_fee_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fee_plan fp
    WHERE fp.id = p_fee_plan_id
      AND fp.deleted_at IS NULL
      AND fp.status = 'published'
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_fee_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_fee_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_fee_plan(uuid) TO service_role;

DROP POLICY IF EXISTS student_fee_select_scoped ON public.student_fee;
DROP POLICY IF EXISTS fee_payment_select_scoped ON public.fee_payment;
DROP POLICY IF EXISTS concession_select_scoped ON public.concession;

CREATE POLICY student_fee_select_scoped
  ON public.student_fee
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        public.can_learner_read_fee_plan(fee_plan_id)
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
    )
  );

CREATE POLICY fee_payment_select_scoped
  ON public.fee_payment
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        public.can_learner_read_fee_plan(fee_plan_id)
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
    )
  );

CREATE POLICY concession_select_scoped
  ON public.concession
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        public.can_learner_read_fee_plan(fee_plan_id)
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
    )
  );
