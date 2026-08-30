-- =============================================================================
-- LumenX Migration — Institute report export jobs (durable)
-- Version: 20260827410000
--
-- Tables (exactly 1):
--   report_job
--
-- Notes:
--   Supabase Storage bucket provisioning / signed URLs are not configured
--   (see assets foundation out-of-scope). Export bytes are stored on the job
--   row (content_text) and served via authenticated Hono download — no public
--   secret URLs.
--
-- Out of scope (defer):
--   Async worker queue, Storage object upload, signed download URLs,
--   large binary (PDF) generation, scheduled recurring exports
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.report_job (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  report_id               text NOT NULL,
  status                  text NOT NULL DEFAULT 'queued',

  file_name               text NULL,
  content_type            text NULL,
  content_text            text NULL,
  error_message           text NULL,

  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  completed_at            timestamptz NULL,
  deleted_at              timestamptz NULL,

  CONSTRAINT report_job_report_id_check CHECK (char_length(trim(report_id)) >= 1),
  CONSTRAINT report_job_status_check CHECK (
    status IN ('queued', 'running', 'ready', 'failed')
  ),
  CONSTRAINT report_job_ready_payload_check CHECK (
    status <> 'ready'
    OR (
      file_name IS NOT NULL
      AND content_type IS NOT NULL
      AND content_text IS NOT NULL
    )
  ),
  CONSTRAINT report_job_failed_message_check CHECK (
    status <> 'failed'
    OR (error_message IS NOT NULL AND char_length(trim(error_message)) >= 1)
  ),
  CONSTRAINT report_job_id_institute_key UNIQUE (id, institute_id)
);

CREATE INDEX report_job_institute_id_idx
  ON public.report_job (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX report_job_institute_status_idx
  ON public.report_job (institute_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER report_job_set_updated_at
  BEFORE UPDATE ON public.report_job
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.report_job IS
  'Institute-scoped report export job. CSV body in content_text until Storage lands.';

COMMENT ON COLUMN public.report_job.content_text IS
  'Generated export body (CSV/text). Not exposed on list DTOs; download endpoint only.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.report_job ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_job_select_staff
  ON public.report_job FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_staff_of_institute(institute_id)
      OR public.is_platform_operator()
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.report_job FROM anon, authenticated;

GRANT SELECT ON TABLE public.report_job TO authenticated;
GRANT ALL ON TABLE public.report_job TO service_role;
