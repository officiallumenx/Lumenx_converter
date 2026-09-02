-- =============================================================================
-- LumenX Migration — School alerts (Connect mandatory/emergency inbox)
-- Version: 20260827460000
-- =============================================================================

CREATE TABLE public.school_alert (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                uuid NOT NULL REFERENCES public.institute (id),
  title                       text NOT NULL,
  summary                     text NOT NULL DEFAULT '',
  detail                      text NOT NULL DEFAULT '',
  severity                    text NOT NULL DEFAULT 'mandatory',
  category                    text NOT NULL DEFAULT 'general',
  source_label                text NOT NULL DEFAULT 'Institute',
  student_id                  uuid NULL REFERENCES public.student (id),
  rule_id                     uuid NULL,
  created_by_user_profile_id  uuid NULL REFERENCES public.user_profile (id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz NULL,

  CONSTRAINT school_alert_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT school_alert_severity_check CHECK (severity IN ('mandatory', 'emergency')),
  CONSTRAINT school_alert_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX school_alert_institute_id_idx
  ON public.school_alert (institute_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE public.school_alert_recipient (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  school_alert_id     uuid NOT NULL,
  user_profile_id     uuid NOT NULL REFERENCES public.user_profile (id),
  student_id          uuid NULL REFERENCES public.student (id),
  read_at             timestamptz NULL,
  acknowledged_at     timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT school_alert_recipient_alert_institute_fkey
    FOREIGN KEY (school_alert_id, institute_id)
    REFERENCES public.school_alert (id, institute_id),
  CONSTRAINT school_alert_recipient_id_institute_key UNIQUE (id, institute_id),
  CONSTRAINT school_alert_recipient_unique_user UNIQUE (school_alert_id, user_profile_id)
);

CREATE INDEX school_alert_recipient_user_idx
  ON public.school_alert_recipient (user_profile_id, created_at DESC)
  WHERE deleted_at IS NULL AND acknowledged_at IS NULL;

CREATE TRIGGER school_alert_set_updated_at
  BEFORE UPDATE ON public.school_alert
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER school_alert_recipient_set_updated_at
  BEFORE UPDATE ON public.school_alert_recipient
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_alert_recipient ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.school_alert FROM anon, authenticated;
REVOKE ALL ON TABLE public.school_alert_recipient FROM anon, authenticated;
GRANT ALL ON TABLE public.school_alert TO service_role;
GRANT ALL ON TABLE public.school_alert_recipient TO service_role;
