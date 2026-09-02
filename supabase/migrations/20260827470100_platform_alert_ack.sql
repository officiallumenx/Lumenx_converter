-- =============================================================================
-- LumenX Migration — Platform alert operator ack (Nexus)
-- Version: 20260827470000
-- =============================================================================

CREATE TABLE public.platform_alert_ack (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key                   text NOT NULL,
  handled_at                  timestamptz NULL,
  handled_by_user_profile_id  uuid NULL REFERENCES public.user_profile (id),
  reopened_at                 timestamptz NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT platform_alert_ack_key_check CHECK (char_length(trim(alert_key)) >= 1)
);

CREATE UNIQUE INDEX platform_alert_ack_key_uidx ON public.platform_alert_ack (alert_key);

CREATE TRIGGER platform_alert_ack_set_updated_at
  BEFORE UPDATE ON public.platform_alert_ack
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.platform_alert_ack ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_alert_ack FROM anon, authenticated;
GRANT ALL ON TABLE public.platform_alert_ack TO service_role;
