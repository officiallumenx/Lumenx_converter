-- =============================================================================
-- LumenX Migration 034 — Messages foundation
-- Version: 20260827320000
--
-- Tables (exactly 2 — step 7.3 / blueprint V2 Messaging):
--   message_thread
--   message
--
-- Out of scope (defer):
--   group/multi-party threads, attachments/Storage, typing indicators,
--   push/notification fan-out, realtime websocket channel, soft-mute,
--   Nexus support_thread (separate commercial domain)
--
-- Model:
--   message_thread (two participants + optional student context)
--     └─ message[] (ordered by sent_at)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. message_thread
-- -----------------------------------------------------------------------------
CREATE TABLE public.message_thread (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  subject                 text NULL,
  student_id              uuid NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),
  counterpart_user_id     uuid NOT NULL REFERENCES public.user_profile (id),

  status                  text NOT NULL DEFAULT 'open',
  last_message_at         timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT message_thread_status_check CHECK (
    status IN ('open', 'closed', 'archived')
  ),
  CONSTRAINT message_thread_participants_distinct_check CHECK (
    created_by_user_id <> counterpart_user_id
  ),
  CONSTRAINT message_thread_subject_check CHECK (
    subject IS NULL OR char_length(trim(subject)) >= 1
  ),

  CONSTRAINT message_thread_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT message_thread_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE INDEX message_thread_institute_status_idx
  ON public.message_thread (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX message_thread_created_by_idx
  ON public.message_thread (created_by_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX message_thread_counterpart_idx
  ON public.message_thread (counterpart_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX message_thread_student_idx
  ON public.message_thread (student_id)
  WHERE deleted_at IS NULL AND student_id IS NOT NULL;

CREATE INDEX message_thread_last_message_idx
  ON public.message_thread (institute_id, last_message_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

CREATE TRIGGER message_thread_set_updated_at
  BEFORE UPDATE ON public.message_thread
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.message_thread IS
  'Two-party institute message thread. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. message
-- -----------------------------------------------------------------------------
CREATE TABLE public.message (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  thread_id               uuid NOT NULL,

  sender_user_id          uuid NOT NULL REFERENCES public.user_profile (id),
  body                    text NOT NULL,

  sent_at                 timestamptz NOT NULL DEFAULT now(),
  read_at                 timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT message_body_check CHECK (char_length(trim(body)) >= 1),

  CONSTRAINT message_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT message_thread_institute_fkey
    FOREIGN KEY (thread_id, institute_id)
    REFERENCES public.message_thread (id, institute_id)
);

CREATE INDEX message_thread_sent_idx
  ON public.message (thread_id, sent_at)
  WHERE deleted_at IS NULL;

CREATE INDEX message_sender_idx
  ON public.message (sender_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX message_institute_idx
  ON public.message (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER message_set_updated_at
  BEFORE UPDATE ON public.message
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.message IS
  'Single message in a message_thread. Soft-delete via deleted_at.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.message_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;

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
        )
      )
    )
  );

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
          )
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.message_thread FROM anon, authenticated;
REVOKE ALL ON TABLE public.message FROM anon, authenticated;

GRANT SELECT ON TABLE public.message_thread TO authenticated;
GRANT SELECT ON TABLE public.message TO authenticated;

GRANT ALL ON TABLE public.message_thread TO service_role;
GRANT ALL ON TABLE public.message TO service_role;
