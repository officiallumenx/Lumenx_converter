-- =============================================================================
-- LumenX Migration — API Idempotency-Key store (Phase 2 Step 9)
-- Version: 20260827470600
--
-- Durable replay for payments / approve / convert / notify / decide / publish.
-- Service-role only.
-- =============================================================================

CREATE TABLE public.api_idempotency_key (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key         text NOT NULL,
  route_key         text NOT NULL,
  idempotency_key   text NOT NULL,
  status            text NOT NULL DEFAULT 'in_progress',
  response_status   int NULL,
  response_body     jsonb NULL,
  error_message     text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,

  CONSTRAINT api_idempotency_key_status_check CHECK (
    status IN ('in_progress', 'completed', 'failed')
  ),
  CONSTRAINT api_idempotency_key_key_check CHECK (
    char_length(trim(idempotency_key)) >= 8
    AND char_length(idempotency_key) <= 200
  ),
  CONSTRAINT api_idempotency_key_route_check CHECK (
    char_length(trim(route_key)) >= 3
  )
);

CREATE UNIQUE INDEX api_idempotency_key_scope_route_key_uidx
  ON public.api_idempotency_key (scope_key, route_key, idempotency_key);

CREATE INDEX api_idempotency_key_expires_idx
  ON public.api_idempotency_key (expires_at);

CREATE TRIGGER api_idempotency_key_set_updated_at
  BEFORE UPDATE ON public.api_idempotency_key
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.api_idempotency_key IS
  'HTTP Idempotency-Key replay store for critical mutate routes. service_role only.';

ALTER TABLE public.api_idempotency_key ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_idempotency_key FROM anon, authenticated;
GRANT ALL ON TABLE public.api_idempotency_key TO service_role;
