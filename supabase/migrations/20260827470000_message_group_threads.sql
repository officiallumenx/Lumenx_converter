-- =============================================================================
-- LumenX Migration — Message group / class threads (2B)
-- Version: 20260827470000
--
-- Extends message_thread for class/group broadcasts via message_thread_participant.
-- Direct two-party threads unchanged (thread_kind = 'direct').
-- =============================================================================

ALTER TABLE public.message_thread
  ADD COLUMN IF NOT EXISTS thread_kind text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS group_class_label text NULL,
  ADD COLUMN IF NOT EXISTS group_section_label text NULL;

ALTER TABLE public.message_thread
  DROP CONSTRAINT IF EXISTS message_thread_participants_distinct_check;

ALTER TABLE public.message_thread
  ALTER COLUMN counterpart_user_id DROP NOT NULL;

ALTER TABLE public.message_thread
  ADD CONSTRAINT message_thread_kind_check CHECK (
    thread_kind IN ('direct', 'group')
  );

ALTER TABLE public.message_thread
  ADD CONSTRAINT message_thread_direct_participant_check CHECK (
    (
      thread_kind = 'direct'
      AND counterpart_user_id IS NOT NULL
      AND created_by_user_id <> counterpart_user_id
    )
    OR (
      thread_kind = 'group'
      AND counterpart_user_id IS NULL
    )
  );

COMMENT ON COLUMN public.message_thread.thread_kind IS
  'direct = two-party DM; group = class/section broadcast with participants table.';

-- -----------------------------------------------------------------------------
-- message_thread_participant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_thread_participant (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id      uuid NOT NULL REFERENCES public.institute (id),
  thread_id         uuid NOT NULL,
  user_profile_id   uuid NOT NULL REFERENCES public.user_profile (id),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT message_thread_participant_thread_institute_fkey
    FOREIGN KEY (thread_id, institute_id)
    REFERENCES public.message_thread (id, institute_id),

  CONSTRAINT message_thread_participant_unique
    UNIQUE (thread_id, user_profile_id)
);

CREATE INDEX IF NOT EXISTS message_thread_participant_user_idx
  ON public.message_thread_participant (user_profile_id, thread_id);

CREATE INDEX IF NOT EXISTS message_thread_participant_thread_idx
  ON public.message_thread_participant (thread_id);

COMMENT ON TABLE public.message_thread_participant IS
  'Group thread membership. Direct threads use counterpart_user_id instead.';

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.message_thread_participant ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_thread_participant_select_scoped
  ON public.message_thread_participant FOR SELECT TO authenticated
  USING (
    public.is_platform_operator()
    OR public.is_staff_of_institute(institute_id)
    OR (
      public.is_institute_member(institute_id)
      AND user_profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.message_thread t
      WHERE t.id = message_thread_participant.thread_id
        AND t.institute_id = message_thread_participant.institute_id
        AND t.deleted_at IS NULL
        AND t.thread_kind = 'direct'
        AND (
          t.created_by_user_id = auth.uid()
          OR t.counterpart_user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS message_thread_select_scoped ON public.message_thread;
CREATE POLICY message_thread_select_scoped
  ON public.message_thread FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        public.is_institute_member(institute_id)
        AND (
          created_by_user_id = auth.uid()
          OR counterpart_user_id = auth.uid()
          OR (
            thread_kind = 'group'
            AND EXISTS (
              SELECT 1
              FROM public.message_thread_participant p
              WHERE p.thread_id = message_thread.id
                AND p.user_profile_id = auth.uid()
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS message_select_scoped ON public.message;
CREATE POLICY message_select_scoped
  ON public.message FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR EXISTS (
        SELECT 1
        FROM public.message_thread t
        WHERE t.id = message.thread_id
          AND t.institute_id = message.institute_id
          AND t.deleted_at IS NULL
          AND public.is_institute_member(t.institute_id)
          AND (
            t.created_by_user_id = auth.uid()
            OR t.counterpart_user_id = auth.uid()
            OR (
              t.thread_kind = 'group'
              AND EXISTS (
                SELECT 1
                FROM public.message_thread_participant p
                WHERE p.thread_id = t.id
                  AND p.user_profile_id = auth.uid()
              )
            )
          )
      )
    )
  );

REVOKE ALL ON TABLE public.message_thread_participant FROM anon, authenticated;
GRANT SELECT ON TABLE public.message_thread_participant TO authenticated;
GRANT ALL ON TABLE public.message_thread_participant TO service_role;
