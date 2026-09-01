-- =============================================================================
-- LumenX Migration — Announcements activity_team audience (Connect Activities V1)
-- Version: 20260827320000
--
-- Adds activity_team_id + activity_team audience scope for team/group notices.
-- =============================================================================

ALTER TABLE public.announcement
  ADD COLUMN activity_team_id uuid NULL
    REFERENCES public.activity_team (id);

CREATE INDEX announcement_activity_team_id_idx
  ON public.announcement (activity_team_id)
  WHERE activity_team_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.announcement
  DROP CONSTRAINT announcement_audience_scope_check;

ALTER TABLE public.announcement
  ADD CONSTRAINT announcement_audience_scope_check CHECK (
    audience_scope IN (
      'all',
      'students',
      'parents',
      'teachers',
      'classes',
      'activity_team'
    )
  );

ALTER TABLE public.announcement
  ADD CONSTRAINT announcement_activity_team_scope_check CHECK (
    (audience_scope = 'activity_team' AND activity_team_id IS NOT NULL)
    OR (audience_scope <> 'activity_team' AND activity_team_id IS NULL)
  );

COMMENT ON COLUMN public.announcement.activity_team_id IS
  'Target activity team/group when audience_scope = activity_team.';

-- -----------------------------------------------------------------------------
-- Learner read helper — team roster + guardians
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_learner_read_announcement(p_announcement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.announcement a
    WHERE a.id = p_announcement_id
      AND a.deleted_at IS NULL
      AND a.status = 'published'
      AND public.is_institute_member(a.institute_id)
      AND (
        a.audience_scope = 'all'
        OR (
          a.audience_scope = 'students'
          AND EXISTS (
            SELECT 1
            FROM public.student s
            WHERE s.institute_id = a.institute_id
              AND s.deleted_at IS NULL
              AND (
                public.is_own_student_row(s.id)
                OR public.is_guardian_of_student(s.id)
              )
          )
        )
        OR (
          a.audience_scope = 'parents'
          AND public.has_institute_role(a.institute_id, 'parent')
        )
        OR (
          a.audience_scope = 'teachers'
          AND (
            public.has_institute_role(a.institute_id, 'teacher')
            OR EXISTS (
              SELECT 1
              FROM public.teacher t
              WHERE t.institute_id = a.institute_id
                AND t.user_profile_id = auth.uid()
                AND t.deleted_at IS NULL
            )
          )
        )
        OR (
          a.audience_scope = 'classes'
          AND (a.class_id IS NOT NULL OR a.section_id IS NOT NULL)
          AND EXISTS (
            SELECT 1
            FROM public.enrollment e
            WHERE e.institute_id = a.institute_id
              AND e.deleted_at IS NULL
              AND e.status = 'active'
              AND (
                public.is_own_student_row(e.student_id)
                OR public.is_guardian_of_student(e.student_id)
              )
              AND (a.class_id IS NULL OR e.class_id = a.class_id)
              AND (a.section_id IS NULL OR e.section_id = a.section_id)
          )
        )
        OR (
          a.audience_scope = 'activity_team'
          AND a.activity_team_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.activity_membership am
            WHERE am.team_id = a.activity_team_id
              AND am.institute_id = a.institute_id
              AND am.deleted_at IS NULL
              AND am.status = 'active'
              AND (
                public.is_own_student_row(am.student_id)
                OR public.is_guardian_of_student(am.student_id)
              )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_announcement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_announcement(uuid) TO service_role;
