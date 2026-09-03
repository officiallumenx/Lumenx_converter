-- =============================================================================
-- LumenX Migration — Login OTP attempt tracking (Phase 1 Step 2 redo)
-- Version: 20260827470500
--
-- Caps brute-force verify attempts against durable hashed challenges.
-- =============================================================================

ALTER TABLE public.login_otp_challenge
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.login_otp_challenge
  DROP CONSTRAINT IF EXISTS login_otp_challenge_attempt_count_check;

ALTER TABLE public.login_otp_challenge
  ADD CONSTRAINT login_otp_challenge_attempt_count_check
  CHECK (attempt_count >= 0 AND attempt_count <= 50);

COMMENT ON COLUMN public.login_otp_challenge.attempt_count IS
  'Failed verify attempts since last send; challenge deleted when max is reached.';
