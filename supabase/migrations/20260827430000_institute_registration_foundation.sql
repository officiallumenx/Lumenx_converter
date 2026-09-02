-- =============================================================================
-- LumenX Migration — Institute self-registration (pending Nexus approval)
-- Version: 20260827430000
--
-- Public applicants submit institute registration requests. No institute row is
-- created until a platform operator approves (later phase). Hono service_role
-- is authoritative for writes; RLS allows applicants to read their own row.
-- =============================================================================

CREATE TABLE public.institute_registration (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id  uuid NOT NULL REFERENCES public.user_profile (id),
  applicant_name     text NOT NULL,
  email              text NOT NULL,
  phone              text NULL,
  payload            jsonb NOT NULL DEFAULT '{}'::jsonb,
  status             text NOT NULL DEFAULT 'pending',
  reviewed_by        uuid NULL REFERENCES public.user_profile (id),
  reviewed_at        timestamptz NULL,
  rejection_reason   text NULL,
  institute_id       uuid NULL REFERENCES public.institute (id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT institute_registration_status_check CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT institute_registration_approved_institute_check CHECK (
    (status = 'approved' AND institute_id IS NOT NULL)
    OR (status <> 'approved')
  ),
  CONSTRAINT institute_registration_rejected_reason_check CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL)
    OR (status <> 'rejected')
  )
);

CREATE INDEX institute_registration_applicant_user_id_idx
  ON public.institute_registration (applicant_user_id);

CREATE INDEX institute_registration_email_lower_idx
  ON public.institute_registration (lower(email));

CREATE INDEX institute_registration_status_idx
  ON public.institute_registration (status);

CREATE INDEX institute_registration_created_at_idx
  ON public.institute_registration (created_at DESC);

-- One open pending application per applicant.
CREATE UNIQUE INDEX institute_registration_one_pending_per_user_uidx
  ON public.institute_registration (applicant_user_id)
  WHERE status = 'pending';

CREATE TRIGGER institute_registration_set_updated_at
  BEFORE UPDATE ON public.institute_registration
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.institute_registration IS
  'Institute onboarding requests awaiting Nexus/platform approval. institute_id is set only after approval.';

COMMENT ON COLUMN public.institute_registration.payload IS
  'Institute application details (name, location, board, principal contact, etc.) as submitted by the applicant.';

-- ── RLS (defense-in-depth; Hono uses service_role) ──────────────────────────

ALTER TABLE public.institute_registration ENABLE ROW LEVEL SECURITY;

CREATE POLICY institute_registration_select_self
  ON public.institute_registration
  FOR SELECT
  TO authenticated
  USING (applicant_user_id = auth.uid());

REVOKE ALL ON public.institute_registration FROM PUBLIC;
GRANT SELECT ON public.institute_registration TO authenticated;
