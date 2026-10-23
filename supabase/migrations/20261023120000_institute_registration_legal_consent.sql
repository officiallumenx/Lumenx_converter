-- =============================================================================
-- LumenX Migration — Institute registration legal consent (server-side)
-- Version: 20261023120000
--
-- Durable consent records for Admin institute self-registration.
-- Required documents: Admin Terms of Service + Admin Privacy Policy.
-- Cookie Policy may be recorded when acknowledged but is not required to register.
--
-- Writes: Hono service_role only (same pattern as institute_registration).
-- Reads: applicant (own registration) + platform operators.
-- Do not backfill historical consent for existing rows.
-- Denylist: do not apply to production (kmpzflsurepjwqnfqyld) without approval.
-- =============================================================================

CREATE TABLE public.institute_registration_legal_consent (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id    uuid NOT NULL
                       REFERENCES public.institute_registration (id) ON DELETE CASCADE,
  document_id        text NOT NULL,
  document_version   text NOT NULL,
  action             text NOT NULL DEFAULT 'registration_accept',
  accepted_at        timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT institute_registration_legal_consent_document_id_check CHECK (
    document_id IN ('admin_terms', 'admin_privacy', 'cookie_policy')
  ),
  CONSTRAINT institute_registration_legal_consent_action_check CHECK (
    action IN ('registration_accept', 'registration_resubmit')
  ),
  CONSTRAINT institute_registration_legal_consent_version_format_check CHECK (
    document_version ~ '^\d{4}-\d{2}-\d{2}$'
  ),
  -- One consent row per document per registration (idempotent retries / upsert).
  CONSTRAINT institute_registration_legal_consent_reg_doc_unique
    UNIQUE (registration_id, document_id)
);

CREATE INDEX institute_registration_legal_consent_registration_id_idx
  ON public.institute_registration_legal_consent (registration_id);

CREATE INDEX institute_registration_legal_consent_accepted_at_idx
  ON public.institute_registration_legal_consent (accepted_at DESC);

COMMENT ON TABLE public.institute_registration_legal_consent IS
  'Server-recorded legal consent for institute registration. accepted_at is authoritative (server time).';

COMMENT ON COLUMN public.institute_registration_legal_consent.document_id IS
  'Stable document key: admin_terms | admin_privacy | cookie_policy.';

COMMENT ON COLUMN public.institute_registration_legal_consent.document_version IS
  'ISO date (YYYY-MM-DD) of the accepted document revision (from legal lastUpdated).';

COMMENT ON COLUMN public.institute_registration_legal_consent.action IS
  'Consent action that created the row (registration_accept or registration_resubmit).';

-- ── RLS (defense-in-depth; Hono uses service_role for writes) ────────────────

ALTER TABLE public.institute_registration_legal_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY institute_registration_legal_consent_select_self
  ON public.institute_registration_legal_consent
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.institute_registration r
      WHERE r.id = registration_id
        AND r.applicant_user_id = auth.uid()
    )
  );

CREATE POLICY institute_registration_legal_consent_select_operator
  ON public.institute_registration_legal_consent
  FOR SELECT
  TO authenticated
  USING (public.is_platform_operator());

REVOKE ALL ON public.institute_registration_legal_consent FROM PUBLIC;
GRANT SELECT ON public.institute_registration_legal_consent TO authenticated;
GRANT ALL ON TABLE public.institute_registration_legal_consent TO service_role;
