-- =============================================================================
-- LumenX Migration 013 — Notifications foundation
-- Version: 20260827120000
--
-- Tables (exactly 5):
--   notification_template
--   notification
--   notification_recipient
--   notification_delivery_attempt
--   device_token
--
-- Out of scope:
--   FCM send workers, Realtime subscriptions, template seed catalog,
--   Auth, Storage, demo institutes/users, per-category notification tables,
--   threaded messaging, announcements/events domain tables
--
-- Model (FROZEN — ONE shared notification system):
--   notification_template (platform and/or institute catalog)
--        ↓
--   notification (institute-scoped rendered event; category = column)
--        ↓
--   notification_recipient (per user_profile read/unread)
--        ↓
--   notification_delivery_attempt (outbox / FCM attempt log)
--
--   device_token (profile-owned push endpoints; multi-app / multi-device)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- Default privileges hardened by Migration 003; this file still REVOKE + GRANT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. notification_template
-- -----------------------------------------------------------------------------
CREATE TABLE public.notification_template (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = platform catalog (Nexus). Non-null = institute override/custom.
  institute_id    uuid NULL REFERENCES public.institute (id),

  template_key    text NOT NULL,
  category        text NOT NULL,
  audience        text NULL,
  title           text NOT NULL,
  body            text NOT NULL,
  priority        text NOT NULL,
  deep_link       text NULL,
  status          text NOT NULL,
  version         text NOT NULL,
  allowed_variables jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,

  CONSTRAINT notification_template_category_check CHECK (
    category IN (
      'attendance',
      'homework',
      'fees',
      'exams',
      'events',
      'transport',
      'leave',
      'announcements',
      'messages',
      'complaints',
      'admissions',
      'careers',
      'certificates',
      'documents',
      'timetable',
      'system',
      'nexus'
    )
  ),
  CONSTRAINT notification_template_priority_check CHECK (
    priority IN ('normal', 'important', 'critical', 'success')
  ),
  CONSTRAINT notification_template_status_check CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT notification_template_audience_check CHECK (
    audience IS NULL OR audience IN (
      'parent',
      'student',
      'teacher',
      'admin',
      'driver',
      'connect',
      'nexus',
      'institute'
    )
  )
);

-- Stable registry identity + version uniqueness (platform + per-institute).
CREATE UNIQUE INDEX notification_template_key_version_uidx
  ON public.notification_template (
    template_key,
    version,
    (COALESCE(institute_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  WHERE deleted_at IS NULL;

-- At most one published row per template_key within platform or institute scope.
CREATE UNIQUE INDEX notification_template_one_published_uidx
  ON public.notification_template (
    template_key,
    (COALESCE(institute_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX notification_template_institute_id_idx
  ON public.notification_template (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_template_category_idx
  ON public.notification_template (category)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_template_status_idx
  ON public.notification_template (status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER notification_template_set_updated_at
  BEFORE UPDATE ON public.notification_template
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_template IS
  'Shared notification catalog. Platform rows have institute_id NULL; institute custom templates set institute_id. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.notification_template.template_key IS
  'Stable registry id (e.g. attendance.parent.daily_absence). Preserved across versions.';

-- -----------------------------------------------------------------------------
-- 2. notification
-- -----------------------------------------------------------------------------
CREATE TABLE public.notification (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                uuid NOT NULL REFERENCES public.institute (id),
  template_id                 uuid NULL REFERENCES public.notification_template (id),

  category                    text NOT NULL,
  priority                    text NOT NULL,
  title                       text NOT NULL,
  body                        text NOT NULL,
  payload                     jsonb NOT NULL DEFAULT '{}'::jsonb,
  deep_link                   text NULL,
  dedupe_key                  text NULL,
  created_by_user_profile_id  uuid NULL REFERENCES public.user_profile (id),

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz NULL,

  CONSTRAINT notification_category_check CHECK (
    category IN (
      'attendance',
      'homework',
      'fees',
      'exams',
      'events',
      'transport',
      'leave',
      'announcements',
      'messages',
      'complaints',
      'admissions',
      'careers',
      'certificates',
      'documents',
      'timetable',
      'system',
      'nexus'
    )
  ),
  CONSTRAINT notification_priority_check CHECK (
    priority IN ('normal', 'important', 'critical', 'success')
  ),

  CONSTRAINT notification_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX notification_institute_dedupe_uidx
  ON public.notification (institute_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX notification_institute_id_idx
  ON public.notification (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_institute_category_idx
  ON public.notification (institute_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_template_id_idx
  ON public.notification (template_id)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_created_at_idx
  ON public.notification (institute_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER notification_set_updated_at
  BEFORE UPDATE ON public.notification
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification IS
  'Institute-scoped rendered notification event. Category is a column — never a per-domain table. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.notification.dedupe_key IS
  'Optional idempotency key within institute (e.g. attendance absence for student+date).';

-- -----------------------------------------------------------------------------
-- 3. notification_recipient
-- -----------------------------------------------------------------------------
CREATE TABLE public.notification_recipient (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  notification_id     uuid NOT NULL,
  user_profile_id     uuid NOT NULL REFERENCES public.user_profile (id),

  read_at             timestamptz NULL,
  starred_at          timestamptz NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT notification_recipient_notification_institute_fkey
    FOREIGN KEY (notification_id, institute_id)
    REFERENCES public.notification (id, institute_id),

  CONSTRAINT notification_recipient_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX notification_recipient_unique_uidx
  ON public.notification_recipient (notification_id, user_profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_recipient_profile_idx
  ON public.notification_recipient (user_profile_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_recipient_institute_id_idx
  ON public.notification_recipient (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX notification_recipient_unread_idx
  ON public.notification_recipient (user_profile_id)
  WHERE deleted_at IS NULL AND read_at IS NULL;

CREATE TRIGGER notification_recipient_set_updated_at
  BEFORE UPDATE ON public.notification_recipient
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.notification_recipient IS
  'Per-profile inbox row. read_at NULL = unread (required UX). starred_at optional. Soft-delete = hide from inbox.';

-- -----------------------------------------------------------------------------
-- 4. notification_delivery_attempt (append-only outbox / FCM log)
-- -----------------------------------------------------------------------------
CREATE TABLE public.notification_delivery_attempt (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                uuid NOT NULL,
  notification_id             uuid NOT NULL,
  notification_recipient_id   uuid NULL,
  device_token_id             uuid NULL,

  channel                     text NOT NULL,
  status                      text NOT NULL,
  error                       text NULL,
  attempted_at                timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notification_delivery_attempt_channel_check CHECK (
    channel IN ('in_app', 'fcm')
  ),
  CONSTRAINT notification_delivery_attempt_status_check CHECK (
    status IN ('pending', 'sent', 'failed', 'skipped')
  ),

  CONSTRAINT notification_delivery_attempt_notification_institute_fkey
    FOREIGN KEY (notification_id, institute_id)
    REFERENCES public.notification (id, institute_id),

  CONSTRAINT notification_delivery_attempt_recipient_institute_fkey
    FOREIGN KEY (notification_recipient_id, institute_id)
    REFERENCES public.notification_recipient (id, institute_id)
);

CREATE INDEX notification_delivery_attempt_notification_id_idx
  ON public.notification_delivery_attempt (notification_id);

CREATE INDEX notification_delivery_attempt_pending_idx
  ON public.notification_delivery_attempt (status, attempted_at)
  WHERE status = 'pending';

CREATE INDEX notification_delivery_attempt_institute_id_idx
  ON public.notification_delivery_attempt (institute_id);

COMMENT ON TABLE public.notification_delivery_attempt IS
  'Append-only delivery outbox / audit. No soft-delete. device_token_id FK added after device_token exists.';

-- -----------------------------------------------------------------------------
-- 5. device_token
-- -----------------------------------------------------------------------------
CREATE TABLE public.device_token (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id   uuid NOT NULL REFERENCES public.user_profile (id),

  app               text NOT NULL,
  platform          text NOT NULL,
  token             text NOT NULL,
  valid             boolean NOT NULL DEFAULT true,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz NULL,

  CONSTRAINT device_token_app_check CHECK (
    app IN ('connect', 'admin', 'transport', 'nexus')
  ),
  CONSTRAINT device_token_platform_check CHECK (
    platform IN ('android', 'ios', 'web')
  )
);

CREATE UNIQUE INDEX device_token_token_uidx
  ON public.device_token (token)
  WHERE deleted_at IS NULL;

CREATE INDEX device_token_profile_idx
  ON public.device_token (user_profile_id)
  WHERE deleted_at IS NULL AND valid = true;

CREATE INDEX device_token_app_platform_idx
  ON public.device_token (user_profile_id, app, platform)
  WHERE deleted_at IS NULL;

CREATE TRIGGER device_token_set_updated_at
  BEFORE UPDATE ON public.device_token
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.device_token IS
  'Profile-owned push endpoint. Invalidate on logout / FCM unregistered (valid=false). Soft-delete via deleted_at.';

-- FK from delivery attempts → device_token (deferred until table exists).
ALTER TABLE public.notification_delivery_attempt
  ADD CONSTRAINT notification_delivery_attempt_device_token_fkey
  FOREIGN KEY (device_token_id)
  REFERENCES public.device_token (id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Mutations intentionally omitted for authenticated (Hono + service_role).
-- Templates: published visible to members; draft/archived institute templates
--   staff-only; platform ops see all. Full catalog writes via service_role.
-- Notifications / recipients: staff of institute, platform ops, or own recipient.
-- Delivery attempts: staff / platform / own via recipient join.
-- Device tokens: owner profile only (or platform ops).

ALTER TABLE public.notification_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipient ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_token ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_template_select_scoped
  ON public.notification_template
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR (
        -- Published catalog: platform templates + institute published templates.
        status = 'published'
        AND (
          institute_id IS NULL
          OR public.is_institute_member(institute_id)
        )
      )
      OR (
        -- Draft/archived institute templates: staff only (not parents/students).
        institute_id IS NOT NULL
        AND public.is_staff_of_institute(institute_id)
      )
    )
  );

CREATE POLICY notification_select_scoped
  ON public.notification
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR EXISTS (
        SELECT 1
        FROM public.notification_recipient nr
        WHERE nr.notification_id = notification.id
          AND nr.institute_id = notification.institute_id
          AND nr.user_profile_id = auth.uid()
          AND nr.deleted_at IS NULL
      )
    )
  );

CREATE POLICY notification_recipient_select_scoped
  ON public.notification_recipient
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_profile_id = auth.uid()
      OR public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

CREATE POLICY notification_delivery_attempt_select_scoped
  ON public.notification_delivery_attempt
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_of_institute(institute_id)
    OR public.is_platform_operator()
    OR EXISTS (
      SELECT 1
      FROM public.notification_recipient nr
      WHERE nr.id = notification_delivery_attempt.notification_recipient_id
        AND nr.institute_id = notification_delivery_attempt.institute_id
        AND nr.user_profile_id = auth.uid()
        AND nr.deleted_at IS NULL
    )
  );

CREATE POLICY device_token_select_own
  ON public.device_token
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_profile_id = auth.uid()
      OR public.is_platform_operator()
    )
  );

-- =============================================================================
-- Privileges (explicit least-privilege; anon gets nothing)
-- =============================================================================
REVOKE ALL ON TABLE public.notification_template FROM anon, authenticated;
REVOKE ALL ON TABLE public.notification FROM anon, authenticated;
REVOKE ALL ON TABLE public.notification_recipient FROM anon, authenticated;
REVOKE ALL ON TABLE public.notification_delivery_attempt FROM anon, authenticated;
REVOKE ALL ON TABLE public.device_token FROM anon, authenticated;

GRANT SELECT ON TABLE public.notification_template TO authenticated;
GRANT SELECT ON TABLE public.notification TO authenticated;
GRANT SELECT ON TABLE public.notification_recipient TO authenticated;
GRANT SELECT ON TABLE public.notification_delivery_attempt TO authenticated;
GRANT SELECT ON TABLE public.device_token TO authenticated;

GRANT ALL ON TABLE public.notification_template TO service_role;
GRANT ALL ON TABLE public.notification TO service_role;
GRANT ALL ON TABLE public.notification_recipient TO service_role;
GRANT ALL ON TABLE public.notification_delivery_attempt TO service_role;
GRANT ALL ON TABLE public.device_token TO service_role;
