-- =============================================================================
-- LumenX Migration 023 — Announcements foundation
-- Version: 20260827240000
--
-- Tables (exactly 1 — step 4.4 / blueprint V1.5):
--   announcement
--
-- Out of scope (defer):
--   Connect SchoolAlert / Admin /alerts rules (notifications path),
--   multi class/section audience junction, notification fan-out,
--   view analytics table, sports/activity announcements (V2)
--
-- Model:
--   institute → announcement[]
--   Learners see status=published only, filtered by audience_scope
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. announcement
-- -----------------------------------------------------------------------------
CREATE TABLE public.announcement (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  title                   text NOT NULL,
  body                    text NULL,

  audience_scope          text NOT NULL DEFAULT 'all',
  audience_label          text NULL,
  class_id                uuid NULL,
  section_id              uuid NULL,

  status                  text NOT NULL DEFAULT 'draft',
  scheduled_at            timestamptz NULL,
  published_at            timestamptz NULL,
  archived_at             timestamptz NULL,

  pinned                  boolean NOT NULL DEFAULT false,
  pin_until               timestamptz NULL,

  views                   integer NOT NULL DEFAULT 0,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT announcement_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT announcement_audience_scope_check CHECK (
    audience_scope IN ('all', 'students', 'parents', 'teachers', 'classes')
  ),
  CONSTRAINT announcement_status_check CHECK (
    status IN ('draft', 'scheduled', 'published', 'archived')
  ),
  CONSTRAINT announcement_views_check CHECK (views >= 0),
  CONSTRAINT announcement_status_schedule_check CHECK (
    (status = 'draft' AND scheduled_at IS NULL AND published_at IS NULL AND archived_at IS NULL)
    OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND published_at IS NULL AND archived_at IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  ),
  CONSTRAINT announcement_classes_scope_check CHECK (
    audience_scope <> 'classes'
    OR class_id IS NOT NULL
    OR section_id IS NOT NULL
  ),

  CONSTRAINT announcement_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT announcement_class_institute_fkey
    FOREIGN KEY (class_id, institute_id)
    REFERENCES public.class (id, institute_id),

  CONSTRAINT announcement_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.section (id, institute_id)
);

CREATE INDEX announcement_institute_id_idx
  ON public.announcement (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX announcement_institute_status_idx
  ON public.announcement (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX announcement_institute_pinned_idx
  ON public.announcement (institute_id, pinned)
  WHERE deleted_at IS NULL AND status = 'published';

CREATE TRIGGER announcement_set_updated_at
  BEFORE UPDATE ON public.announcement
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.announcement IS
  'Long-form institute notice. Separate from event (4.3) and Connect SchoolAlert (notifications).';

COMMENT ON COLUMN public.announcement.status IS
  'draft | scheduled | published | archived. Learners only read published.';

COMMENT ON COLUMN public.announcement.views IS
  'Display counter only in 4.4 — no view-event analytics table yet.';

-- -----------------------------------------------------------------------------
-- 2. Learner read helper (audience-scoped; baked in to avoid medium finding)
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
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_learner_read_announcement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_learner_read_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_learner_read_announcement(uuid) TO service_role;

COMMENT ON FUNCTION public.can_learner_read_announcement(uuid) IS
  'Non-staff may read published announcements matching audience_scope.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_select_scoped
  ON public.announcement FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.can_learner_read_announcement(id)
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.announcement FROM anon, authenticated;

GRANT SELECT ON TABLE public.announcement TO authenticated;
GRANT ALL ON TABLE public.announcement TO service_role;
