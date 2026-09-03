-- =============================================================================
-- LumenX Migration — Durable login OTP challenges (Phase 1 Step 2)
-- Version: 20260827470400
--
-- Survives API restarts and multi-instance deploys (replaces in-memory Map).
-- Service-role only — never exposed to anon/authenticated clients.
-- =============================================================================

CREATE TABLE public.login_otp_challenge (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose         text NOT NULL,
  institute_id    uuid NOT NULL REFERENCES public.institute (id),
  challenge_key   text NOT NULL,
  channel         text NOT NULL,
  destination     text NOT NULL,
  subject_id      uuid NOT NULL,
  otp_hash        text NOT NULL,
  expires_at      timestamptz NOT NULL,
  last_sent_at    timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT login_otp_challenge_purpose_check CHECK (
    purpose IN ('parent_login', 'staff_login')
  ),
  CONSTRAINT login_otp_challenge_channel_check CHECK (
    channel IN ('sms', 'email', 'mobile')
  ),
  CONSTRAINT login_otp_challenge_key_check CHECK (
    char_length(trim(challenge_key)) >= 3
  ),
  CONSTRAINT login_otp_challenge_otp_hash_check CHECK (
    char_length(otp_hash) = 64
  )
);

CREATE UNIQUE INDEX login_otp_challenge_purpose_key_uidx
  ON public.login_otp_challenge (purpose, challenge_key);

CREATE INDEX login_otp_challenge_expires_idx
  ON public.login_otp_challenge (expires_at);

CREATE INDEX login_otp_challenge_institute_idx
  ON public.login_otp_challenge (institute_id);

CREATE TRIGGER login_otp_challenge_set_updated_at
  BEFORE UPDATE ON public.login_otp_challenge
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.login_otp_challenge IS
  'Short-lived parent/staff login OTP challenges. otp_hash only; service_role access.';

ALTER TABLE public.login_otp_challenge ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.login_otp_challenge FROM anon, authenticated;
GRANT ALL ON TABLE public.login_otp_challenge TO service_role;
