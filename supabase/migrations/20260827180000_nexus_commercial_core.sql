-- =============================================================================
-- LumenX Migration 014 — Nexus commercial core
-- Version: 20260827180000
--
-- Tables (exactly 4):
--   license
--   module_entitlement
--   subscription
--   subscription_period
--
-- Already exists (not recreated):
--   platform_role, platform_operator
--
-- Out of scope:
--   institute_registration, renewal_record, billing_adjustment, payment,
--   support threads, policy_rule, storage_quota, quote table, demo seeds,
--   license demo amountInr/payments[] (commercial SoT = subscription)
--
-- Model:
--   institute → license → module_entitlement[]
--   institute → subscription → subscription_period[]
--
-- Hono /api/nexus = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. license (plan truth per institute)
-- -----------------------------------------------------------------------------
CREATE TABLE public.license (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id    uuid NOT NULL REFERENCES public.institute (id),

  plan            text NOT NULL,
  cadence         text NOT NULL,
  starts_on       date NULL,
  reminder_days   integer[] NOT NULL DEFAULT ARRAY[30, 14, 7, 3, 1],

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,

  CONSTRAINT license_plan_check CHECK (
    plan IN ('core', 'plus', 'max')
  ),
  CONSTRAINT license_cadence_check CHECK (
    cadence IN ('monthly', 'yearly')
  ),

  CONSTRAINT license_id_institute_key UNIQUE (id, institute_id)
);

-- One live license row per institute.
CREATE UNIQUE INDEX license_institute_live_uidx
  ON public.license (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX license_plan_idx
  ON public.license (plan)
  WHERE deleted_at IS NULL;

CREATE TRIGGER license_set_updated_at
  BEFORE UPDATE ON public.license
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.license IS
  'Nexus plan truth for an institute (core/plus/max). Module gates live in module_entitlement. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. module_entitlement (normalized Admin / Connect / Apps gates)
-- -----------------------------------------------------------------------------
CREATE TABLE public.module_entitlement (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id    uuid NOT NULL,
  license_id      uuid NOT NULL,

  scope           text NOT NULL,
  portal_id       text NULL,
  target_id       text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,

  CONSTRAINT module_entitlement_scope_check CHECK (
    scope IN ('admin_module', 'connect_portal', 'connect_module', 'platform_app')
  ),
  CONSTRAINT module_entitlement_portal_check CHECK (
    portal_id IS NULL OR portal_id IN ('teachers', 'parents', 'students')
  ),
  CONSTRAINT module_entitlement_portal_scope_check CHECK (
    (scope = 'connect_module' AND portal_id IS NOT NULL)
    OR (scope <> 'connect_module' AND portal_id IS NULL)
  ),

  CONSTRAINT module_entitlement_license_institute_fkey
    FOREIGN KEY (license_id, institute_id)
    REFERENCES public.license (id, institute_id)
);

CREATE UNIQUE INDEX module_entitlement_unique_uidx
  ON public.module_entitlement (
    institute_id,
    scope,
    COALESCE(portal_id, ''),
    target_id
  )
  WHERE deleted_at IS NULL;

CREATE INDEX module_entitlement_license_id_idx
  ON public.module_entitlement (license_id)
  WHERE deleted_at IS NULL;

CREATE INDEX module_entitlement_institute_id_idx
  ON public.module_entitlement (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER module_entitlement_set_updated_at
  BEFORE UPDATE ON public.module_entitlement
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.module_entitlement IS
  'Normalized entitlement gates (admin modules, connect portals/modules, platform apps). Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 3. subscription (commercial lifecycle per institute)
-- -----------------------------------------------------------------------------
CREATE TABLE public.subscription (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  lifecycle_status        text NOT NULL,
  assigned_rate_inr       numeric(12, 2) NOT NULL,
  active_student_count    integer NOT NULL DEFAULT 0,
  trial_start_at          timestamptz NULL,
  trial_end_at            timestamptz NULL,
  grace_ends_at           timestamptz NULL,
  current_period_id       uuid NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT subscription_lifecycle_check CHECK (
    lifecycle_status IN (
      'registered',
      'approved',
      'trial_active',
      'trial_expiring',
      'trial_expired',
      'grace_period',
      'read_only',
      'active'
    )
  ),
  CONSTRAINT subscription_rate_check CHECK (assigned_rate_inr >= 0),
  CONSTRAINT subscription_student_count_check CHECK (active_student_count >= 0),

  CONSTRAINT subscription_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX subscription_institute_live_uidx
  ON public.subscription (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX subscription_lifecycle_idx
  ON public.subscription (lifecycle_status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER subscription_set_updated_at
  BEFORE UPDATE ON public.subscription
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.subscription IS
  'Institute commercial subscription (rate × students). No Core/Plus/Max tiers here — those are license.plan.';

-- -----------------------------------------------------------------------------
-- 4. subscription_period (accepted/current period snapshots)
-- -----------------------------------------------------------------------------
CREATE TABLE public.subscription_period (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL,
  subscription_id         uuid NOT NULL,

  duration_months         integer NOT NULL,
  active_student_count    integer NOT NULL,
  assigned_rate_inr       numeric(12, 2) NOT NULL,
  monthly_price_inr       numeric(12, 2) NOT NULL,
  regular_amount_inr      numeric(12, 2) NOT NULL,
  discount_amount_inr     numeric(12, 2) NOT NULL DEFAULT 0,
  payable_amount_inr      numeric(12, 2) NOT NULL,
  free_months             integer NOT NULL DEFAULT 0,
  starts_at               timestamptz NOT NULL,
  ends_at                 timestamptz NOT NULL,
  payment_method          text NOT NULL,
  payment_status          text NOT NULL,
  payment_ref             text NULL,
  amount_paid_inr         numeric(12, 2) NOT NULL DEFAULT 0,
  paid_at                 timestamptz NULL,
  is_current              boolean NOT NULL DEFAULT false,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT subscription_period_duration_check CHECK (
    duration_months IN (1, 6, 12)
  ),
  CONSTRAINT subscription_period_payment_method_check CHECK (
    payment_method IN ('online', 'offline')
  ),
  CONSTRAINT subscription_period_payment_status_check CHECK (
    payment_status IN (
      'none',
      'checkout_started',
      'verification_pending',
      'paid',
      'failed',
      'rejected'
    )
  ),
  CONSTRAINT subscription_period_dates_check CHECK (ends_at >= starts_at),
  CONSTRAINT subscription_period_amounts_check CHECK (
    assigned_rate_inr >= 0
    AND monthly_price_inr >= 0
    AND regular_amount_inr >= 0
    AND discount_amount_inr >= 0
    AND payable_amount_inr >= 0
    AND amount_paid_inr >= 0
    AND free_months >= 0
    AND active_student_count >= 0
  ),

  CONSTRAINT subscription_period_subscription_institute_fkey
    FOREIGN KEY (subscription_id, institute_id)
    REFERENCES public.subscription (id, institute_id),

  CONSTRAINT subscription_period_id_institute_key UNIQUE (id, institute_id)
);

-- At most one current period per subscription.
CREATE UNIQUE INDEX subscription_period_one_current_uidx
  ON public.subscription_period (subscription_id)
  WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX subscription_period_subscription_id_idx
  ON public.subscription_period (subscription_id)
  WHERE deleted_at IS NULL;

CREATE INDEX subscription_period_institute_id_idx
  ON public.subscription_period (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER subscription_period_set_updated_at
  BEFORE UPDATE ON public.subscription_period
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.subscription_period IS
  'Accepted commercial period snapshot. Payment verification workflows deferred; status fields reserved.';

-- Optional pointer integrity: current_period_id must belong to same subscription/institute.
ALTER TABLE public.subscription
  ADD CONSTRAINT subscription_current_period_fkey
  FOREIGN KEY (current_period_id, institute_id)
  REFERENCES public.subscription_period (id, institute_id);

-- =============================================================================
-- Row Level Security — platform operators only (Nexus plane)
-- =============================================================================
ALTER TABLE public.license ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_entitlement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_period ENABLE ROW LEVEL SECURITY;

CREATE POLICY license_select_platform
  ON public.license
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

CREATE POLICY module_entitlement_select_platform
  ON public.module_entitlement
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

CREATE POLICY subscription_select_platform
  ON public.subscription
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

CREATE POLICY subscription_period_select_platform
  ON public.subscription_period
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.license FROM anon, authenticated;
REVOKE ALL ON TABLE public.module_entitlement FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscription FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscription_period FROM anon, authenticated;

GRANT SELECT ON TABLE public.license TO authenticated;
GRANT SELECT ON TABLE public.module_entitlement TO authenticated;
GRANT SELECT ON TABLE public.subscription TO authenticated;
GRANT SELECT ON TABLE public.subscription_period TO authenticated;

GRANT ALL ON TABLE public.license TO service_role;
GRANT ALL ON TABLE public.module_entitlement TO service_role;
GRANT ALL ON TABLE public.subscription TO service_role;
GRANT ALL ON TABLE public.subscription_period TO service_role;
