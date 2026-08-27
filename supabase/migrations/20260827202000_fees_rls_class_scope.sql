-- =============================================================================
-- LumenX Migration 018 — Fees RLS: class-scoped publish for learners
-- Version: 20260827202000
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_learner_read_fee_student(
  p_fee_plan_id uuid,
  p_student_id uuid
)
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
      AND (
        fp.publish_scope = 'institute'
        OR EXISTS (
          SELECT 1
          FROM public.enrollment e
          WHERE e.student_id = p_student_id
            AND e.institute_id = fp.institute_id
            AND e.academic_year_id = fp.academic_year_id
            AND e.status = 'active'
            AND e.deleted_at IS NULL
            AND e.class_id = ANY (fp.published_class_ids)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_fee_student(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_fee_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_fee_student(uuid, uuid) TO service_role;

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
        public.can_learner_read_fee_student(fee_plan_id, student_id)
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
        public.can_learner_read_fee_student(fee_plan_id, student_id)
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
        public.can_learner_read_fee_student(fee_plan_id, student_id)
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
    )
  );
