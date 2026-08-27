-- =============================================================================
-- LumenX Migration 041 — Nexus policies + storage quota foundation
-- Version: 20260827370000
--
-- Tables (exactly 2 — step 6.3 / blueprint V1.5 Policies + Storage quotas):
--   policy_rule
--   storage_quota
--
-- Out of scope (defer):
--   fired platform_alert table (DERIVED unless ack-state required),
--   alert evaluation jobs / notify fan-out, role_permission catalog,
--   per-file Storage enforcement, WhatsApp/email delivery
--
-- Model:
--   policy_rule = platform alert rule config (toggle / severity)
--   storage_quota = plan-tier GB ceilings (core / plus / max)
--   Institute usage % remains DERIVED at read time (not stored here).
--
-- Hono /api/nexus = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. policy_rule
-- -----------------------------------------------------------------------------
CREATE TABLE public.policy_rule (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  kind                      text NOT NULL,
  name                      text NOT NULL,
  description               text NOT NULL DEFAULT '',
  condition_text            text NOT NULL DEFAULT '',
  severity_default          text NOT NULL DEFAULT 'medium',
  enabled                   boolean NOT NULL DEFAULT true,

  updated_by_user_id        uuid NULL REFERENCES public.user_profile (id),

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT policy_rule_kind_check CHECK (
    kind IN (
      'payment_overdue',
      'renewal_approaching',
      'storage_quota_exceeded',
      'platform_incident',
      'security_issue',
      'sla_breach',
      'institute_usage_risk',
      'support_escalation'
    )
  ),
  CONSTRAINT policy_rule_severity_check CHECK (
    severity_default IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT policy_rule_name_check CHECK (char_length(trim(name)) >= 1)
);

CREATE UNIQUE INDEX policy_rule_kind_live_uidx
  ON public.policy_rule (kind)
  WHERE deleted_at IS NULL;

CREATE INDEX policy_rule_enabled_idx
  ON public.policy_rule (enabled)
  WHERE deleted_at IS NULL;

CREATE TRIGGER policy_rule_set_updated_at
  BEFORE UPDATE ON public.policy_rule
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.policy_rule IS
  'Nexus platform alert rule config. Fired alerts remain DERIVED.';

-- Seed default rules (idempotent via kind unique).
INSERT INTO public.policy_rule (kind, name, description, condition_text, severity_default, enabled)
VALUES
  (
    'payment_overdue',
    'Payment overdue',
    'Fires when an institute license payment status is overdue.',
    'institute.paymentStatus = overdue',
    'high',
    true
  ),
  (
    'renewal_approaching',
    'Renewal approaching',
    'Fires when renewal enters the configured reminder window.',
    'days_until_renewal ≤ reminder window',
    'medium',
    true
  ),
  (
    'storage_quota_exceeded',
    'Storage quota exceeded',
    'Fires when institute storage pressure crosses plan quota.',
    'storage_pressure ≥ 95%',
    'high',
    true
  ),
  (
    'platform_incident',
    'Platform incident',
    'Manual or system platform outage / degradation signal.',
    'platform.health ≠ operational OR operator-declared',
    'critical',
    true
  ),
  (
    'security_issue',
    'Security issue',
    'Suspicious Nexus operator access or token anomalies.',
    'failed_nexus_logins ≥ threshold OR token anomaly',
    'critical',
    true
  ),
  (
    'sla_breach',
    'SLA breach',
    'Support ticket exceeds platform SLA clock.',
    'support.ticket.open_beyond_sla = true',
    'high',
    true
  ),
  (
    'institute_usage_risk',
    'Institute usage risk',
    'Sharp decline or inactive usage on a live institute.',
    'usage_drop ≥ 15 pts OR usageStatus = inactive',
    'medium',
    true
  ),
  (
    'support_escalation',
    'Support escalation',
    'High-priority support thread escalated to Nexus operators.',
    'support.priority = high AND status ∈ {open, in_progress}',
    'high',
    true
  );

-- -----------------------------------------------------------------------------
-- 2. storage_quota (plan-tier ceilings)
-- -----------------------------------------------------------------------------
CREATE TABLE public.storage_quota (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  plan                      text NOT NULL,
  limit_gb                  integer NOT NULL,
  warning_pct               integer NOT NULL DEFAULT 80,

  updated_by_user_id        uuid NULL REFERENCES public.user_profile (id),

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT storage_quota_plan_check CHECK (
    plan IN ('core', 'plus', 'max')
  ),
  CONSTRAINT storage_quota_limit_check CHECK (limit_gb >= 1),
  CONSTRAINT storage_quota_warning_pct_check CHECK (
    warning_pct >= 1 AND warning_pct <= 100
  )
);

CREATE UNIQUE INDEX storage_quota_plan_live_uidx
  ON public.storage_quota (plan)
  WHERE deleted_at IS NULL;

CREATE TRIGGER storage_quota_set_updated_at
  BEFORE UPDATE ON public.storage_quota
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.storage_quota IS
  'Plan-tier storage ceilings (GB). Institute usage remains DERIVED.';

INSERT INTO public.storage_quota (plan, limit_gb, warning_pct)
VALUES
  ('core', 50, 80),
  ('plus', 200, 80),
  ('max', 500, 80);

-- =============================================================================
-- Row Level Security — platform operators only
-- =============================================================================
ALTER TABLE public.policy_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_rule_select_platform
  ON public.policy_rule FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

CREATE POLICY storage_quota_select_platform
  ON public.storage_quota FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.policy_rule FROM anon, authenticated;
REVOKE ALL ON TABLE public.storage_quota FROM anon, authenticated;

GRANT SELECT ON TABLE public.policy_rule TO authenticated;
GRANT SELECT ON TABLE public.storage_quota TO authenticated;

GRANT ALL ON TABLE public.policy_rule TO service_role;
GRANT ALL ON TABLE public.storage_quota TO service_role;
