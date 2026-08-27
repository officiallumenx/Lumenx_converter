-- =============================================================================
-- LumenX Migration 022 — Events audience RLS hardening
-- Version: 20260827231000
--
-- Fixes medium finding from step 4.3 security review:
--   published events must honor audience_scope for non-staff readers.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_learner_read_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event ev
    WHERE ev.id = p_event_id
      AND ev.deleted_at IS NULL
      AND ev.published = true
      AND ev.cancelled = false
      AND public.is_institute_member(ev.institute_id)
      AND (
        ev.audience_scope = 'all'
        OR (
          ev.audience_scope = 'students'
          AND EXISTS (
            SELECT 1
            FROM public.student s
            WHERE s.institute_id = ev.institute_id
              AND s.deleted_at IS NULL
              AND (
                public.is_own_student_row(s.id)
                OR public.is_guardian_of_student(s.id)
              )
          )
        )
        OR (
          ev.audience_scope = 'parents'
          AND public.has_institute_role(ev.institute_id, 'parent')
        )
        OR (
          ev.audience_scope = 'teachers'
          AND (
            public.has_institute_role(ev.institute_id, 'teacher')
            OR EXISTS (
              SELECT 1
              FROM public.teacher t
              WHERE t.institute_id = ev.institute_id
                AND t.user_profile_id = auth.uid()
                AND t.deleted_at IS NULL
            )
          )
        )
        OR (
          ev.audience_scope = 'classes'
          AND (ev.class_id IS NOT NULL OR ev.section_id IS NOT NULL)
          AND EXISTS (
            SELECT 1
            FROM public.enrollment e
            WHERE e.institute_id = ev.institute_id
              AND e.deleted_at IS NULL
              AND e.status = 'active'
              AND (
                public.is_own_student_row(e.student_id)
                OR public.is_guardian_of_student(e.student_id)
              )
              AND (ev.class_id IS NULL OR e.class_id = ev.class_id)
              AND (ev.section_id IS NULL OR e.section_id = ev.section_id)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_event(uuid) TO service_role;

DROP POLICY IF EXISTS event_select_scoped ON public.event;

CREATE POLICY event_select_scoped
  ON public.event FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_event(id)
    )
  );

COMMENT ON FUNCTION public.can_learner_read_event(uuid) IS
  'Non-staff may read published, non-cancelled events matching audience_scope.';
