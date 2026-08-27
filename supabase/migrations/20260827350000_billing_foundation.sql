-- =============================================================================
-- LumenX Migration 038 — Nexus billing foundation
-- Version: 20260827350000
--
-- Tables (exactly 3 — step 6.1 / blueprint V1.5 Billing):
--   renewal_record
--   billing_adjustment
--   payment
--
-- Out of scope (defer):
--   quote table (DERIVED), payment gateway / Razorpay lock-in,
--   automatic overdue jobs, PDF invoice generation, storage_quota,
--   support_thread, policy_rule, webhook reconciliation
--
-- Model:
--   institute → subscription → renewal_record (invoice-like snapshot)
--                            → billing_adjustment (post-renewal headcount)
--                            → payment (provider-agnostic ledger)
--
-- Hono /api/nexus = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. renewal_record
-- -----------------------------------------------------------------------------
CREATE TABLE public.renewal_record (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),
  subscription_id           uuid NOT NULL,

  subscription_period_id    uuid NULL,
  invoice_number            text NOT NULL,
  status                    text NOT NULL DEFAULT 'draft',

  period_starts_at          timestamptz NOT NULL,
  period_ends_at            timestamptz NOT NULL,
  due_at                    timestamptz NULL,
  issued_at                 timestamptz NULL,

  active_student_count      integer NOT NULL DEFAULT 0,
  assigned_rate_inr         numeric(12, 2) NOT NULL DEFAULT 0,
  regular_amount_inr        numeric(12, 2) NOT NULL DEFAULT 0,
  discount_amount_inr       numeric(12, 2) NOT NULL DEFAULT 0,
  payable_amount_inr        numeric(12, 2) NOT NULL DEFAULT 0,
  amount_paid_inr           numeric(12, 2) NOT NULL DEFAULT 0,

  notes                     text NULL,
  created_by_user_id        uuid NOT NULL REFERENCES public.user_profile (id),

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT renewal_record_status_check CHECK (
    status IN ('draft', 'issued', 'pending', 'paid', 'overdue', 'cancelled')
  ),
  CONSTRAINT renewal_record_invoice_number_check CHECK (
    char_length(trim(invoice_number)) >= 1
  ),
  CONSTRAINT renewal_record_dates_check CHECK (period_ends_at >= period_starts_at),
  CONSTRAINT renewal_record_amounts_check CHECK (
    active_student_count >= 0
    AND assigned_rate_inr >= 0
    AND regular_amount_inr >= 0
    AND discount_amount_inr >= 0
    AND payable_amount_inr >= 0
    AND amount_paid_inr >= 0
  ),

  CONSTRAINT renewal_record_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT renewal_record_subscription_institute_fkey
    FOREIGN KEY (subscription_id, institute_id)
    REFERENCES public.subscription (id, institute_id),

  CONSTRAINT renewal_record_period_institute_fkey
    FOREIGN KEY (subscription_period_id, institute_id)
    REFERENCES public.subscription_period (id, institute_id)
);

CREATE UNIQUE INDEX renewal_record_institute_invoice_uidx
  ON public.renewal_record (institute_id, invoice_number)
  WHERE deleted_at IS NULL;

CREATE INDEX renewal_record_institute_status_idx
  ON public.renewal_record (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX renewal_record_subscription_idx
  ON public.renewal_record (subscription_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER renewal_record_set_updated_at
  BEFORE UPDATE ON public.renewal_record
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.renewal_record IS
  'Nexus renewal / invoice-like commercial snapshot. Quote remains DERIVED.';

-- -----------------------------------------------------------------------------
-- 2. billing_adjustment
-- -----------------------------------------------------------------------------
CREATE TABLE public.billing_adjustment (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),
  subscription_id           uuid NOT NULL,
  renewal_record_id         uuid NULL,

  kind                      text NOT NULL DEFAULT 'headcount_increase',
  status                    text NOT NULL DEFAULT 'pending',

  purchase_student_count    integer NOT NULL DEFAULT 0,
  live_student_count        integer NOT NULL DEFAULT 0,
  additional_student_count  integer NOT NULL DEFAULT 0,
  additional_monthly_inr    numeric(12, 2) NOT NULL DEFAULT 0,
  remaining_months          integer NOT NULL DEFAULT 0,
  payable_amount_inr        numeric(12, 2) NOT NULL DEFAULT 0,

  note                      text NULL,
  created_by_user_id        uuid NOT NULL REFERENCES public.user_profile (id),
  applied_at                timestamptz NULL,
  applied_by_user_id        uuid NULL REFERENCES public.user_profile (id),

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT billing_adjustment_kind_check CHECK (
    kind IN ('headcount_increase', 'credit', 'debit', 'other')
  ),
  CONSTRAINT billing_adjustment_status_check CHECK (
    status IN ('pending', 'applied', 'waived', 'cancelled')
  ),
  CONSTRAINT billing_adjustment_counts_check CHECK (
    purchase_student_count >= 0
    AND live_student_count >= 0
    AND additional_student_count >= 0
    AND remaining_months >= 0
    AND additional_monthly_inr >= 0
    AND payable_amount_inr >= 0
  ),

  CONSTRAINT billing_adjustment_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT billing_adjustment_subscription_institute_fkey
    FOREIGN KEY (subscription_id, institute_id)
    REFERENCES public.subscription (id, institute_id),

  CONSTRAINT billing_adjustment_renewal_institute_fkey
    FOREIGN KEY (renewal_record_id, institute_id)
    REFERENCES public.renewal_record (id, institute_id)
);

CREATE INDEX billing_adjustment_institute_status_idx
  ON public.billing_adjustment (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX billing_adjustment_subscription_idx
  ON public.billing_adjustment (subscription_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER billing_adjustment_set_updated_at
  BEFORE UPDATE ON public.billing_adjustment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.billing_adjustment IS
  'Post-renewal billing adjustment (e.g. headcount increase). Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 3. payment (provider-agnostic)
-- -----------------------------------------------------------------------------
CREATE TABLE public.payment (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id              uuid NOT NULL REFERENCES public.institute (id),
  subscription_id           uuid NULL,
  renewal_record_id         uuid NULL,
  billing_adjustment_id     uuid NULL,

  amount_inr                numeric(12, 2) NOT NULL,
  method                    text NOT NULL DEFAULT 'offline',
  status                    text NOT NULL DEFAULT 'recorded',

  provider                  text NULL,
  provider_ref              text NULL,
  note                      text NULL,

  recorded_by_user_id       uuid NOT NULL REFERENCES public.user_profile (id),
  recorded_at               timestamptz NOT NULL DEFAULT now(),
  verified_by_user_id       uuid NULL REFERENCES public.user_profile (id),
  verified_at               timestamptz NULL,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz NULL,

  CONSTRAINT payment_amount_check CHECK (amount_inr > 0),
  CONSTRAINT payment_method_check CHECK (
    method IN ('online', 'offline', 'bank_transfer', 'upi', 'cheque', 'other')
  ),
  CONSTRAINT payment_status_check CHECK (
    status IN ('recorded', 'verified', 'rejected', 'refunded')
  ),
  CONSTRAINT payment_target_check CHECK (
    renewal_record_id IS NOT NULL OR billing_adjustment_id IS NOT NULL
  ),

  CONSTRAINT payment_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT payment_subscription_institute_fkey
    FOREIGN KEY (subscription_id, institute_id)
    REFERENCES public.subscription (id, institute_id),

  CONSTRAINT payment_renewal_institute_fkey
    FOREIGN KEY (renewal_record_id, institute_id)
    REFERENCES public.renewal_record (id, institute_id),

  CONSTRAINT payment_adjustment_institute_fkey
    FOREIGN KEY (billing_adjustment_id, institute_id)
    REFERENCES public.billing_adjustment (id, institute_id)
);

CREATE INDEX payment_institute_status_idx
  ON public.payment (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX payment_renewal_idx
  ON public.payment (renewal_record_id)
  WHERE deleted_at IS NULL AND renewal_record_id IS NOT NULL;

CREATE INDEX payment_adjustment_idx
  ON public.payment (billing_adjustment_id)
  WHERE deleted_at IS NULL AND billing_adjustment_id IS NOT NULL;

CREATE TRIGGER payment_set_updated_at
  BEFORE UPDATE ON public.payment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.payment IS
  'Provider-agnostic payment ledger (offline/manual first). Soft-delete via deleted_at.';

-- =============================================================================
-- Row Level Security — platform operators only
-- =============================================================================
ALTER TABLE public.renewal_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_adjustment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY renewal_record_select_platform
  ON public.renewal_record FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

CREATE POLICY billing_adjustment_select_platform
  ON public.billing_adjustment FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

CREATE POLICY payment_select_platform
  ON public.payment FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_platform_operator());

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.renewal_record FROM anon, authenticated;
REVOKE ALL ON TABLE public.billing_adjustment FROM anon, authenticated;
REVOKE ALL ON TABLE public.payment FROM anon, authenticated;

GRANT SELECT ON TABLE public.renewal_record TO authenticated;
GRANT SELECT ON TABLE public.billing_adjustment TO authenticated;
GRANT SELECT ON TABLE public.payment TO authenticated;

GRANT ALL ON TABLE public.renewal_record TO service_role;
GRANT ALL ON TABLE public.billing_adjustment TO service_role;
GRANT ALL ON TABLE public.payment TO service_role;
