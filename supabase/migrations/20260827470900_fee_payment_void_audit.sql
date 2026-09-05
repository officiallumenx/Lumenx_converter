-- Fee payment void audit columns (office reception reverse).
-- Version: 20260827470900
-- Soft-delete (deleted_at) remains the filter for ledger sums.
-- New voids should set void_reason / voided_at / voided_by_user_id via the API.

ALTER TABLE public.fee_payment
  ADD COLUMN IF NOT EXISTS void_reason text NULL;

ALTER TABLE public.fee_payment
  ADD COLUMN IF NOT EXISTS voided_at timestamptz NULL;

ALTER TABLE public.fee_payment
  ADD COLUMN IF NOT EXISTS voided_by_user_id uuid NULL
    REFERENCES public.user_profile (id);

COMMENT ON COLUMN public.fee_payment.void_reason IS
  'Reason when an office payment is voided/reversed (set by Admin Fees).';
COMMENT ON COLUMN public.fee_payment.voided_at IS
  'When the payment was voided.';
COMMENT ON COLUMN public.fee_payment.voided_by_user_id IS
  'Staff user who voided the office payment.';

CREATE INDEX IF NOT EXISTS fee_payment_voided_at_idx
  ON public.fee_payment (institute_id, voided_at DESC)
  WHERE deleted_at IS NOT NULL;
