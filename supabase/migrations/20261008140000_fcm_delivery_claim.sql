-- =============================================================================
-- LumenX Migration — FCM delivery claim / concurrency
-- Version: 20261008140000
--
-- Allows workers to atomically claim pending FCM rows (status → sending)
-- so Railway + local/dev processes cannot double-send the same outbox item.
-- Stale `sending` rows (worker crash) can be reclaimed by age.
-- =============================================================================

ALTER TABLE public.notification_delivery_attempt
  DROP CONSTRAINT IF EXISTS notification_delivery_attempt_status_check;

ALTER TABLE public.notification_delivery_attempt
  ADD CONSTRAINT notification_delivery_attempt_status_check CHECK (
    status IN ('pending', 'sending', 'sent', 'failed', 'skipped')
  );

CREATE INDEX IF NOT EXISTS notification_delivery_attempt_fcm_sending_idx
  ON public.notification_delivery_attempt (status, attempted_at)
  WHERE channel = 'fcm' AND status = 'sending';

COMMENT ON COLUMN public.notification_delivery_attempt.status IS
  'pending = ready; sending = claimed by a worker; sent/failed/skipped = terminal for this attempt cycle.';
