-- =============================================================================
-- LumenX Migration — Alert rule fires (persisted evaluation results)
-- Version: 20260827470200
-- =============================================================================

CREATE TABLE public.alert_fire (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id                uuid NOT NULL REFERENCES public.institute (id),
  rule_id                     uuid NOT NULL REFERENCES public.alert_rule (id),
  title                       text NOT NULL,
  detail                      text NOT NULL DEFAULT '',
  fired_at                    timestamptz NOT NULL DEFAULT now(),
  resolved_at                 timestamptz NULL,
  resolved_by_user_profile_id uuid NULL REFERENCES public.user_profile (id),
  complaint_id                uuid NULL,
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz NULL,

  CONSTRAINT alert_fire_title_check CHECK (char_length(trim(title)) >= 1)
);

CREATE INDEX alert_fire_institute_unresolved_idx
  ON public.alert_fire (institute_id, fired_at DESC)
  WHERE deleted_at IS NULL AND resolved_at IS NULL;

CREATE INDEX alert_fire_rule_id_idx
  ON public.alert_fire (rule_id, fired_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER alert_fire_set_updated_at
  BEFORE UPDATE ON public.alert_fire
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.alert_fire ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.alert_fire FROM anon, authenticated;
GRANT ALL ON TABLE public.alert_fire TO service_role;
