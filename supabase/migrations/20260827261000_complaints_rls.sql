-- =============================================================================
-- LumenX Migration 027 — Complaints RLS harden
-- Version: 20260827261000
--
-- Fixes findings from step 4.6 security review:
--   1) Drafts must not be readable by broad staff roles (triage + requester only)
--   2) class_teacher queue is section-scoped via teacher_assignment ∩ enrollment
--      (not institute-wide for every teacher)
-- =============================================================================

DROP POLICY IF EXISTS complaint_select_scoped ON public.complaint;

CREATE POLICY complaint_select_scoped
  ON public.complaint FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR requested_by_user_id = auth.uid()
      -- Drafts: triage only (beyond requester / platform above)
      OR (
        status = 'draft'
        AND public.has_institute_role(
          institute_id,
          'institute_admin',
          'principal',
          'vice_principal',
          'coordinator'
        )
      )
      -- Non-draft: wide staff read
      OR (
        status <> 'draft'
        AND public.has_institute_role(
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
      )
      OR (
        status <> 'draft'
        AND student_id IS NOT NULL
        AND (
          public.is_own_student_row(student_id)
          OR public.is_guardian_of_student(student_id)
        )
      )
      OR (
        teacher_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.teacher t
          WHERE t.id = complaint.teacher_id
            AND t.institute_id = complaint.institute_id
            AND t.user_profile_id = auth.uid()
            AND t.deleted_at IS NULL
        )
      )
      -- Class-teacher queue: assigned to student's active enrollment section(s)
      OR (
        destination = 'class_teacher'
        AND status <> 'draft'
        AND student_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.teacher t
          JOIN public.teacher_assignment ta
            ON ta.teacher_id = t.id
           AND ta.institute_id = complaint.institute_id
           AND ta.status = 'active'
           AND ta.deleted_at IS NULL
          JOIN public.enrollment e
            ON e.section_id = ta.section_id
           AND e.institute_id = complaint.institute_id
           AND e.student_id = complaint.student_id
           AND e.status = 'active'
           AND e.deleted_at IS NULL
          WHERE t.institute_id = complaint.institute_id
            AND t.user_profile_id = auth.uid()
            AND t.deleted_at IS NULL
            AND t.status = 'active'
        )
      )
    )
  );

COMMENT ON POLICY complaint_select_scoped ON public.complaint IS
  'Drafts: requester + triage. Non-draft: staff / linked learner / own teacher / section-assigned class teacher.';
