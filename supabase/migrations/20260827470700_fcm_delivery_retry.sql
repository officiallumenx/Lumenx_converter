-- =============================================================================
-- LumenX Migration — FCM delivery outbox retry (Phase 2 Step 9)
-- Version: 20260827470700
--
-- Adds attempt_count / next_attempt_at / max_attempts so pending FCM rows
-- can be retried with backoff instead of failing once permanently.
-- =============================================================================

ALTER TABLE public.notification_delivery_attempt
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS max_attempts int NOT NULL DEFAULT 8;

ALTER TABLE public.notification_delivery_attempt
  DROP CONSTRAINT IF EXISTS notification_delivery_attempt_attempt_count_check;

ALTER TABLE public.notification_delivery_attempt
  ADD CONSTRAINT notification_delivery_attempt_attempt_count_check
  CHECK (attempt_count >= 0);

ALTER TABLE public.notification_delivery_attempt
  DROP CONSTRAINT IF EXISTS notification_delivery_attempt_max_attempts_check;

ALTER TABLE public.notification_delivery_attempt
  ADD CONSTRAINT notification_delivery_attempt_max_attempts_check
  CHECK (max_attempts >= 1);

CREATE INDEX IF NOT EXISTS notification_delivery_attempt_fcm_pending_idx
  ON public.notification_delivery_attempt (status, next_attempt_at, attempted_at)
  WHERE channel = 'fcm' AND status = 'pending';

COMMENT ON COLUMN public.notification_delivery_attempt.attempt_count IS
  'Number of FCM send tries completed for this outbox row.';
COMMENT ON COLUMN public.notification_delivery_attempt.next_attempt_at IS
  'When pending, worker may retry at/after this time (NULL = immediately).';
COMMENT ON COLUMN public.notification_delivery_attempt.max_attempts IS
  'After this many failed sends, status becomes failed.';
