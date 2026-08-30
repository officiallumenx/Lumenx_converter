-- =============================================================================
-- LumenX Migration — Institute alert rules (durable)
-- Version: 20260827400000
--
-- Tables (exactly 1):
--   alert_rule
--
-- Notes:
--   Distinct from public.policy_rule (Nexus platform-global; no institute_id).
--   Admin /alerts rules are institute-owned configuration for evaluation stubs.
--
-- Out of scope (defer):
--   Fired alert persistence, notify fan-out, scheduled evaluation jobs
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.alert_rule (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  name                    text NOT NULL,
  icon_key                text NOT NULL DEFAULT 'warning',
  description             text NOT NULL DEFAULT '',
  priority                text NOT NULL DEFAULT 'P2',
  channels                text[] NOT NULL DEFAULT ARRAY['Email']::text[],
  audience                text NOT NULL DEFAULT 'Institute admin',
  active                  boolean NOT NULL DEFAULT true,
  config                  jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT alert_rule_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT alert_rule_icon_key_check CHECK (
    icon_key IN (
      'attendance',
      'warning',
      'complaint',
      'security',
      'emergency'
    )
  ),
  CONSTRAINT alert_rule_priority_check CHECK (
    priority IN ('P0', 'P1', 'P2', 'P3')
  ),
  CONSTRAINT alert_rule_audience_check CHECK (char_length(trim(audience)) >= 1),
  CONSTRAINT alert_rule_channels_check CHECK (cardinality(channels) >= 1),
  CONSTRAINT alert_rule_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX alert_rule_institute_id_idx
  ON public.alert_rule (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX alert_rule_institute_active_idx
  ON public.alert_rule (institute_id, active)
  WHERE deleted_at IS NULL;

CREATE TRIGGER alert_rule_set_updated_at
  BEFORE UPDATE ON public.alert_rule
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.alert_rule IS
  'Institute-scoped Admin alert rule config. Not Nexus policy_rule.';

COMMENT ON COLUMN public.alert_rule.config IS
  'Optional knobs: threshold_pct, consecutive_exams (json object).';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.alert_rule ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_rule_select_staff
  ON public.alert_rule FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.alert_rule FROM anon, authenticated;

GRANT SELECT ON TABLE public.alert_rule TO authenticated;
GRANT ALL ON TABLE public.alert_rule TO service_role;
