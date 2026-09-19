-- Fees flowchart: category-scoped office payments + note rules (txn ID except cash/offline).

ALTER TABLE public.fee_payment
  ADD COLUMN IF NOT EXISTS fee_component_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fee_payment_component_institute_fkey'
  ) THEN
    ALTER TABLE public.fee_payment
      ADD CONSTRAINT fee_payment_component_institute_fkey
      FOREIGN KEY (fee_component_id, institute_id)
      REFERENCES public.fee_component (id, institute_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fee_payment_component_id_idx
  ON public.fee_payment (fee_component_id)
  WHERE deleted_at IS NULL AND fee_component_id IS NOT NULL;

COMMENT ON COLUMN public.fee_payment.fee_component_id IS
  'Flowchart: payment applied to a fee category (tuition/books/transport/extra). Required for new office payments.';
