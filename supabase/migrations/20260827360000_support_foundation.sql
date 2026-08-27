-- =============================================================================
-- LumenX Migration 039 — Nexus support foundation
-- Version: 20260827360000
--
-- Tables (exactly 2 — step 6.2 / blueprint V1.5 Support):
--   support_thread
--   support_message
--
-- Out of scope (defer):
--   WhatsApp / email integration, SLA clocks / auto-escalation,
--   file attachments / Storage, realtime websocket fan-out,
--   policy_rule / storage_quota (step 6.3)
--
-- Model:
--   institute → support_thread → support_message[]
--   Internal notes (author_role = internal) are Nexus-only.
--
-- Hono /api/nexus = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. support_thread
-- -----------------------------------------------------------------------------
CREATE TABLE public.support_thread (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),

  subject                   text NOT NULL,
  category                  text NOT NULL DEFAULT 'issue',
  status                    text NOT NULL DEFAULT 'open',
  priority                  text NOT NULL DEFAULT 'medium',

  assignee_handle           text NULL,
  assignee_user_id          uuid NULL REFERENCES public.user_profile (id),

  created_by_user_id        uuid NOT NULL REFERENCES public.user_profile (id),
  last_message_at           timestamptz NULL,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT support_thread_subject_check CHECK (
    char_length(trim(subject)) >= 1
  ),
  CONSTRAINT support_thread_category_check CHECK (
    category IN (
      'issue',
      'feature_request',
      'feedback',
      'improvement_request'
    )
  ),
  CONSTRAINT support_thread_status_check CHECK (
    status IN ('open', 'in_progress', 'waiting', 'resolved')
  ),
  CONSTRAINT support_thread_priority_check CHECK (
    priority IN ('low', 'medium', 'high')
  ),
  CONSTRAINT support_thread_assignee_handle_check CHECK (
    assignee_handle IS NULL OR char_length(trim(assignee_handle)) >= 1
  ),

  CONSTRAINT support_thread_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX support_thread_institute_status_idx
  ON public.support_thread (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX support_thread_institute_updated_idx
  ON public.support_thread (institute_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX support_thread_assignee_idx
  ON public.support_thread (assignee_user_id)
  WHERE deleted_at IS NULL AND assignee_user_id IS NOT NULL;

CREATE TRIGGER support_thread_set_updated_at
  BEFORE UPDATE ON public.support_thread
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.support_thread IS
  'Nexus support center thread (institute-level). Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. support_message
-- -----------------------------------------------------------------------------
CREATE TABLE public.support_message (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),
  thread_id                 uuid NOT NULL,

  author_user_id            uuid NOT NULL REFERENCES public.user_profile (id),
  author_role               text NOT NULL,
  author_label              text NOT NULL,
  body                      text NOT NULL,
  is_internal               boolean NOT NULL DEFAULT false,

  sent_at                   timestamptz NOT NULL DEFAULT now(),

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT support_message_author_role_check CHECK (
    author_role IN ('institute', 'nexus', 'internal')
  ),
  CONSTRAINT support_message_internal_role_check CHECK (
    is_internal = (author_role = 'internal')
  ),
  CONSTRAINT support_message_body_check CHECK (
    char_length(trim(body)) >= 1
  ),
  CONSTRAINT support_message_author_label_check CHECK (
    char_length(trim(author_label)) >= 1
  ),

  CONSTRAINT support_message_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT support_message_thread_institute_fkey
    FOREIGN KEY (thread_id, institute_id)
    REFERENCES public.support_thread (id, institute_id)
);

CREATE INDEX support_message_thread_sent_idx
  ON public.support_message (thread_id, sent_at)
  WHERE deleted_at IS NULL;

CREATE INDEX support_message_institute_idx
  ON public.support_message (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER support_message_set_updated_at
  BEFORE UPDATE ON public.support_message
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.support_message IS
  'Support thread message. Internal notes (is_internal) are Nexus-only.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.support_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_thread_select_scoped
  ON public.support_thread FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
    )
  );

-- Institute staff never SELECT internal notes (existence / content oracle).
CREATE POLICY support_message_select_scoped
  ON public.support_message FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR (
        public.is_staff_of_institute(institute_id)
        AND is_internal = false
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.support_thread FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_message FROM anon, authenticated;

GRANT SELECT ON TABLE public.support_thread TO authenticated;
GRANT SELECT ON TABLE public.support_message TO authenticated;

GRANT ALL ON TABLE public.support_thread TO service_role;
GRANT ALL ON TABLE public.support_message TO service_role;
