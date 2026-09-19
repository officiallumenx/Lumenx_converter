-- =============================================================================
-- Marks entry flowchart: internal/external scores + audit history
-- Version: 20260917140000
-- =============================================================================

ALTER TABLE public.mark_score
  ADD COLUMN IF NOT EXISTS internal_marks integer NULL,
  ADD COLUMN IF NOT EXISTS external_marks integer NULL;

ALTER TABLE public.mark_score
  DROP CONSTRAINT IF EXISTS mark_score_internal_marks_check,
  DROP CONSTRAINT IF EXISTS mark_score_external_marks_check,
  DROP CONSTRAINT IF EXISTS mark_score_split_sum_check;

ALTER TABLE public.mark_score
  ADD CONSTRAINT mark_score_internal_marks_check CHECK (
    internal_marks IS NULL OR internal_marks >= 0
  ),
  ADD CONSTRAINT mark_score_external_marks_check CHECK (
    external_marks IS NULL OR external_marks >= 0
  ),
  ADD CONSTRAINT mark_score_split_sum_check CHECK (
    internal_marks IS NULL
    OR external_marks IS NULL
    OR marks IS NULL
    OR (internal_marks + external_marks) = marks
  );

COMMENT ON COLUMN public.mark_score.internal_marks IS
  'Flowchart internal component. With external_marks must sum to marks (total).';
COMMENT ON COLUMN public.mark_score.external_marks IS
  'Flowchart external/written component. With internal_marks must sum to marks (total).';
COMMENT ON COLUMN public.mark_score.marks IS
  'Canonical total marks for the sheet (internal + external when split is used).';

CREATE TABLE IF NOT EXISTS public.mark_score_audit (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id        uuid NOT NULL REFERENCES public.institute (id),
  mark_entry_id       uuid NOT NULL,
  mark_score_id       uuid NULL,
  enrollment_id       uuid NOT NULL,
  student_id          uuid NOT NULL,
  action              text NOT NULL,
  previous_marks      integer NULL,
  previous_internal   integer NULL,
  previous_external   integer NULL,
  next_marks          integer NULL,
  next_internal       integer NULL,
  next_external       integer NULL,
  actor_user_id       uuid NULL,
  note                text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mark_score_audit_action_check CHECK (
    action IN ('save', 'submit', 'publish', 'return', 'reject', 'replace')
  )
);

CREATE INDEX IF NOT EXISTS mark_score_audit_entry_idx
  ON public.mark_score_audit (mark_entry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mark_score_audit_institute_idx
  ON public.mark_score_audit (institute_id, created_at DESC);

COMMENT ON TABLE public.mark_score_audit IS
  'Marks history/audit for every score change (flowchart).';

ALTER TABLE public.mark_score_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mark_score_audit FROM anon, authenticated;
GRANT ALL ON TABLE public.mark_score_audit TO service_role;
