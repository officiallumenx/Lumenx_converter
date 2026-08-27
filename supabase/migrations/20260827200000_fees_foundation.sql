-- =============================================================================
-- LumenX Migration 016 — Fees foundation
-- Version: 20260827200000
--
-- Tables (exactly 5 — blueprint):
--   fee_plan
--   fee_component
--   student_fee
--   fee_payment
--   concession
--
-- Out of scope:
--   receipt table (generated doc/view), payment gateway, transport stop rates,
--   publish_fees RPC, collection rollup MV, demo seeds, Storage
--
-- Model:
--   academic_year → fee_plan (draft|published)
--                 → fee_component[] (tuition|books|transport|custom + class_amounts)
--                 → concession[] (per student × component)
--                 → student_fee (ledger totals) → fee_payment[] (offline office)
--
-- class_amounts: jsonb map { "<class_uuid>": number } on fee_component
--   (avoids a 6th junction table while preserving per-class defaults).
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. fee_plan
-- -----------------------------------------------------------------------------
CREATE TABLE public.fee_plan (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL REFERENCES public.institute (id),
  academic_year_id    uuid NOT NULL,

  status              text NOT NULL DEFAULT 'draft',
  publish_scope       text NOT NULL DEFAULT 'institute',
  published_class_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  published_at        timestamptz NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT fee_plan_status_check CHECK (
    status IN ('draft', 'published')
  ),
  CONSTRAINT fee_plan_publish_scope_check CHECK (
    publish_scope IN ('institute', 'classes')
  ),
  CONSTRAINT fee_plan_publish_classes_check CHECK (
    (publish_scope = 'institute' AND cardinality(published_class_ids) = 0)
    OR (publish_scope = 'classes' AND cardinality(published_class_ids) > 0)
  ),
  CONSTRAINT fee_plan_published_at_check CHECK (
    (status = 'draft' AND published_at IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL)
  ),

  CONSTRAINT fee_plan_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT fee_plan_academic_year_institute_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id)
);

CREATE UNIQUE INDEX fee_plan_institute_year_live_uidx
  ON public.fee_plan (institute_id, academic_year_id)
  WHERE deleted_at IS NULL;

CREATE INDEX fee_plan_institute_id_idx
  ON public.fee_plan (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX fee_plan_status_idx
  ON public.fee_plan (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER fee_plan_set_updated_at
  BEFORE UPDATE ON public.fee_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.fee_plan IS
  'Institute fee catalog for one academic year. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- 2. fee_component
-- -----------------------------------------------------------------------------
CREATE TABLE public.fee_component (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  fee_plan_id         uuid NOT NULL,

  kind                text NOT NULL,
  name                text NOT NULL,
  active              boolean NOT NULL DEFAULT true,
  assigned_to_all     boolean NOT NULL DEFAULT true,
  assigned_class_ids  uuid[] NOT NULL DEFAULT '{}'::uuid[],
  class_amounts       jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT fee_component_kind_check CHECK (
    kind IN ('tuition', 'books', 'transport', 'custom')
  ),
  CONSTRAINT fee_component_assign_check CHECK (
    (assigned_to_all = true AND cardinality(assigned_class_ids) = 0)
    OR (assigned_to_all = false AND cardinality(assigned_class_ids) > 0)
  ),
  CONSTRAINT fee_component_class_amounts_object_check CHECK (
    jsonb_typeof(class_amounts) = 'object'
  ),

  CONSTRAINT fee_component_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT fee_component_plan_institute_fkey
    FOREIGN KEY (fee_plan_id, institute_id)
    REFERENCES public.fee_plan (id, institute_id)
);

CREATE INDEX fee_component_plan_id_idx
  ON public.fee_component (fee_plan_id)
  WHERE deleted_at IS NULL;

CREATE INDEX fee_component_institute_id_idx
  ON public.fee_component (institute_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER fee_component_set_updated_at
  BEFORE UPDATE ON public.fee_component
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.fee_component IS
  'Fee category/component on a plan. class_amounts maps class uuid → amount INR.';

COMMENT ON COLUMN public.fee_component.class_amounts IS
  'JSON object: keys are class UUIDs, values are non-negative numeric amounts.';

-- -----------------------------------------------------------------------------
-- 3. student_fee (ledger totals per student × plan)
-- -----------------------------------------------------------------------------
CREATE TABLE public.student_fee (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  fee_plan_id         uuid NOT NULL,
  student_id          uuid NOT NULL,

  billed_amount       numeric(12, 2) NOT NULL DEFAULT 0,
  paid_amount         numeric(12, 2) NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'due',

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT student_fee_status_check CHECK (
    status IN ('paid', 'partial', 'due')
  ),
  CONSTRAINT student_fee_amounts_check CHECK (
    billed_amount >= 0 AND paid_amount >= 0
  ),

  CONSTRAINT student_fee_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT student_fee_plan_institute_fkey
    FOREIGN KEY (fee_plan_id, institute_id)
    REFERENCES public.fee_plan (id, institute_id),

  CONSTRAINT student_fee_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE UNIQUE INDEX student_fee_plan_student_live_uidx
  ON public.student_fee (fee_plan_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX student_fee_institute_id_idx
  ON public.student_fee (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX student_fee_student_id_idx
  ON public.student_fee (student_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER student_fee_set_updated_at
  BEFORE UPDATE ON public.student_fee
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.student_fee IS
  'Per-student fee ledger totals for a plan. Line items are resolved from components + concessions.';

-- -----------------------------------------------------------------------------
-- 4. fee_payment (offline office payments)
-- -----------------------------------------------------------------------------
CREATE TABLE public.fee_payment (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL,
  fee_plan_id             uuid NOT NULL,
  student_fee_id          uuid NOT NULL,
  student_id              uuid NOT NULL,

  amount                  numeric(12, 2) NOT NULL,
  method                  text NOT NULL,
  receipt_no              text NOT NULL,
  paid_on                 date NOT NULL,
  note                    text NULL,
  recorded_by_user_id     uuid NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT fee_payment_method_check CHECK (
    method IN ('cash', 'cheque', 'upi_office', 'bank_transfer', 'other')
  ),
  CONSTRAINT fee_payment_amount_check CHECK (amount > 0),

  CONSTRAINT fee_payment_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT fee_payment_plan_institute_fkey
    FOREIGN KEY (fee_plan_id, institute_id)
    REFERENCES public.fee_plan (id, institute_id),

  CONSTRAINT fee_payment_student_fee_institute_fkey
    FOREIGN KEY (student_fee_id, institute_id)
    REFERENCES public.student_fee (id, institute_id),

  CONSTRAINT fee_payment_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id)
);

CREATE UNIQUE INDEX fee_payment_receipt_no_live_uidx
  ON public.fee_payment (institute_id, receipt_no)
  WHERE deleted_at IS NULL;

CREATE INDEX fee_payment_plan_id_idx
  ON public.fee_payment (fee_plan_id)
  WHERE deleted_at IS NULL;

CREATE INDEX fee_payment_student_id_idx
  ON public.fee_payment (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX fee_payment_student_fee_id_idx
  ON public.fee_payment (student_fee_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER fee_payment_set_updated_at
  BEFORE UPDATE ON public.fee_payment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.fee_payment IS
  'Offline office fee payment. No payment gateway in V1.5 foundation.';

-- -----------------------------------------------------------------------------
-- 5. concession (per-student component override)
-- -----------------------------------------------------------------------------
CREATE TABLE public.concession (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL,
  fee_plan_id         uuid NOT NULL,
  student_id          uuid NOT NULL,
  fee_component_id    uuid NOT NULL,

  amount              numeric(12, 2) NOT NULL,
  note                text NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT concession_amount_check CHECK (amount >= 0),

  CONSTRAINT concession_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT concession_plan_institute_fkey
    FOREIGN KEY (fee_plan_id, institute_id)
    REFERENCES public.fee_plan (id, institute_id),

  CONSTRAINT concession_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT concession_component_institute_fkey
    FOREIGN KEY (fee_component_id, institute_id)
    REFERENCES public.fee_component (id, institute_id)
);

CREATE UNIQUE INDEX concession_plan_student_component_live_uidx
  ON public.concession (fee_plan_id, student_id, fee_component_id)
  WHERE deleted_at IS NULL;

CREATE INDEX concession_plan_id_idx
  ON public.concession (fee_plan_id)
  WHERE deleted_at IS NULL;

CREATE INDEX concession_student_id_idx
  ON public.concession (student_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER concession_set_updated_at
  BEFORE UPDATE ON public.concession
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.concession IS
  'Per-student fee component amount override (concession). Soft-delete via deleted_at.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.fee_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_component ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concession ENABLE ROW LEVEL SECURITY;

-- Catalog: staff + platform. Published visibility for learners is enforced in Hono.
CREATE POLICY fee_plan_select_scoped
  ON public.fee_plan
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

CREATE POLICY fee_component_select_scoped
  ON public.fee_component
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

CREATE POLICY student_fee_select_scoped
  ON public.student_fee
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY fee_payment_select_scoped
  ON public.fee_payment
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY concession_select_scoped
  ON public.concession
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
      OR public.is_own_student_row(student_id)
      OR public.is_guardian_of_student(student_id)
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.fee_plan FROM anon, authenticated;
REVOKE ALL ON TABLE public.fee_component FROM anon, authenticated;
REVOKE ALL ON TABLE public.student_fee FROM anon, authenticated;
REVOKE ALL ON TABLE public.fee_payment FROM anon, authenticated;
REVOKE ALL ON TABLE public.concession FROM anon, authenticated;

GRANT SELECT ON TABLE public.fee_plan TO authenticated;
GRANT SELECT ON TABLE public.fee_component TO authenticated;
GRANT SELECT ON TABLE public.student_fee TO authenticated;
GRANT SELECT ON TABLE public.fee_payment TO authenticated;
GRANT SELECT ON TABLE public.concession TO authenticated;

GRANT ALL ON TABLE public.fee_plan TO service_role;
GRANT ALL ON TABLE public.fee_component TO service_role;
GRANT ALL ON TABLE public.student_fee TO service_role;
GRANT ALL ON TABLE public.fee_payment TO service_role;
GRANT ALL ON TABLE public.concession TO service_role;
