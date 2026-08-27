-- =============================================================================
-- LumenX Migration 021 — Events / calendar foundation
-- Version: 20260827230000
--
-- Tables (exactly 1 — step 4.3 / blueprint V1.5):
--   event
--
-- Views:
--   calendar_event  (academic calendar projection over event)
--
-- Out of scope (defer):
--   announcement (step 4.4), RSVP submissions, notifications fanout,
--   banner/attachment storage assets, recurrence engine,
--   activity_calendar_event (V2)
--
-- Model:
--   institute → event[]
--   calendar_event = view filtering source=calendar OR holiday/exam kinds
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. event
-- -----------------------------------------------------------------------------
CREATE TABLE public.event (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  title                   text NOT NULL,
  kind                    text NOT NULL,
  custom_kind_label       text NULL,
  source                  text NOT NULL,

  starts_on               date NOT NULL,
  ends_on                 date NULL,
  start_time              time NULL,
  end_time                time NULL,

  audience_scope          text NOT NULL DEFAULT 'all',
  audience_label          text NULL,
  class_id                uuid NULL,
  section_id              uuid NULL,

  location                text NULL,
  description             text NULL,
  reminder                text NOT NULL DEFAULT 'none',
  banner_asset_path       text NULL,

  registration_required   boolean NOT NULL DEFAULT false,
  recurrence              text NULL,
  rsvp_count              integer NOT NULL DEFAULT 0,

  published               boolean NOT NULL DEFAULT false,
  published_at            timestamptz NULL,
  cancelled               boolean NOT NULL DEFAULT false,
  cancellation_reason     text NULL,
  cancelled_at            timestamptz NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT event_kind_check CHECK (
    kind IN ('holiday', 'exam', 'meeting', 'function', 'custom')
  ),
  CONSTRAINT event_custom_kind_check CHECK (
    (kind = 'custom' AND custom_kind_label IS NOT NULL AND char_length(trim(custom_kind_label)) >= 1)
    OR (kind <> 'custom' AND custom_kind_label IS NULL)
  ),
  CONSTRAINT event_source_check CHECK (
    source IN ('calendar', 'events')
  ),
  CONSTRAINT event_audience_scope_check CHECK (
    audience_scope IN ('all', 'students', 'parents', 'teachers', 'classes')
  ),
  CONSTRAINT event_reminder_check CHECK (
    reminder IN ('none', 'one_day', 'one_hour', 'one_week_one_day')
  ),
  CONSTRAINT event_dates_check CHECK (
    ends_on IS NULL OR ends_on >= starts_on
  ),
  CONSTRAINT event_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT event_rsvp_count_check CHECK (rsvp_count >= 0),
  CONSTRAINT event_cancel_reason_check CHECK (
    (cancelled = false AND cancellation_reason IS NULL AND cancelled_at IS NULL)
    OR (cancelled = true)
  ),
  CONSTRAINT event_publish_consistency_check CHECK (
    (published = false AND published_at IS NULL)
    OR (published = true AND published_at IS NOT NULL)
    OR (cancelled = true)
  ),

  CONSTRAINT event_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT event_class_institute_fkey
    FOREIGN KEY (class_id, institute_id)
    REFERENCES public.class (id, institute_id),

  CONSTRAINT event_section_institute_fkey
    FOREIGN KEY (section_id, institute_id)
    REFERENCES public.section (id, institute_id)
);

CREATE INDEX event_institute_id_idx
  ON public.event (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX event_institute_starts_on_idx
  ON public.event (institute_id, starts_on)
  WHERE deleted_at IS NULL;

CREATE INDEX event_institute_source_idx
  ON public.event (institute_id, source)
  WHERE deleted_at IS NULL;

CREATE INDEX event_institute_published_idx
  ON public.event (institute_id, published)
  WHERE deleted_at IS NULL AND cancelled = false;

CREATE TRIGGER event_set_updated_at
  BEFORE UPDATE ON public.event
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.event IS
  'Institute calendar/event row shared by Academic Calendar and Institute Events Admin surfaces.';

COMMENT ON COLUMN public.event.source IS
  'calendar = Academic Calendar surface; events = Institute Events surface.';

COMMENT ON COLUMN public.event.rsvp_count IS
  'Display counter only in 4.3 — no RSVP submission table yet.';

-- -----------------------------------------------------------------------------
-- 2. calendar_event view (blueprint: calendar = view over event)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.calendar_event
  WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.institute_id,
  e.title,
  e.kind,
  e.custom_kind_label,
  e.source,
  e.starts_on,
  e.ends_on,
  e.start_time,
  e.end_time,
  e.audience_scope,
  e.audience_label,
  e.class_id,
  e.section_id,
  e.location,
  e.description,
  e.reminder,
  e.banner_asset_path,
  e.registration_required,
  e.recurrence,
  e.rsvp_count,
  e.published,
  e.published_at,
  e.cancelled,
  e.cancellation_reason,
  e.cancelled_at,
  e.created_by_user_id,
  e.created_at,
  e.updated_at,
  e.deleted_at
FROM public.event e
WHERE e.deleted_at IS NULL
  AND e.cancelled = false
  AND (
    e.source = 'calendar'
    OR e.kind IN ('holiday', 'exam', 'meeting', 'function')
  );

COMMENT ON VIEW public.calendar_event IS
  'Academic calendar projection over event (source=calendar or holiday/exam/meeting/function).';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_select_scoped
  ON public.event FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR (
        published = true
        AND cancelled = false
        AND public.is_institute_member(institute_id)
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.event FROM anon, authenticated;
REVOKE ALL ON TABLE public.calendar_event FROM anon, authenticated;

GRANT SELECT ON TABLE public.event TO authenticated;
GRANT SELECT ON TABLE public.calendar_event TO authenticated;

GRANT ALL ON TABLE public.event TO service_role;
GRANT SELECT ON TABLE public.calendar_event TO service_role;
