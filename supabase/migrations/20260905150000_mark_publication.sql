-- =============================================================================
-- LumenX Migration — mark_publication
-- Version: 20260905150000
--
-- Tables (1):
--   mark_publication
--
-- Model:
--   mark_publication — durable publish event for a mark_entry.
--   Persisted when publishMarkEntryForActor succeeds; captures score_count
--   and optional publish note.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. mark_publication
-- -----------------------------------------------------------------------------
CREATE TABLE public.mark_publication (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  mark_entry_id           uuid NOT NULL,
  academic_year_id        uuid NOT NULL,
  class_id                uuid NOT NULL,
  section_id              uuid NOT NULL,
  exam_id                 uuid NOT NULL,
  subject_id              uuid NOT NULL,
  published_at            timestamptz NOT NULL DEFAULT now(),
  published_by_user_id    uuid NOT NULL REFERENCES public.user_profile (id),
  score_count             integer NOT NULL DEFAULT 0,
  note                    text NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT mark_publication_score_count_check CHECK (score_count >= 0),

  CONSTRAINT mark_publication_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT mark_publication_mark_entry_institute_fkey
    FOREIGN KEY (mark_entry_id, institute_id)
    REFERENCES public.mark_entry (id, institute_id),

  CONSTRAINT mark_publication_academic_year_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id),

  CONSTRAINT mark_publication_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id),

  CONSTRAINT mark_publication_exam_year_fkey
    FOREIGN KEY (exam_id, institute_id, academic_year_id)
    REFERENCES public.exam (id, institute_id, academic_year_id),

  CONSTRAINT mark_publication_subject_institute_fkey
    FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subject (id, institute_id)
);

CREATE INDEX mark_publication_section_published_idx
  ON public.mark_publication (institute_id, section_id, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_publication_mark_entry_idx
  ON public.mark_publication (mark_entry_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mark_publication_exam_idx
  ON public.mark_publication (exam_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER mark_publication_set_updated_at
  BEFORE UPDATE ON public.mark_publication
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.mark_publication IS 'Durable mark_entry publish event. Soft-delete via deleted_at. score_count snapshot from scores at publish time.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.mark_publication ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mark_publication FROM anon, authenticated;
GRANT SELECT ON public.mark_publication TO authenticated;

CREATE POLICY mark_publication_staff_select
  ON public.mark_publication FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_staff_of_institute(institute_id)
  );

CREATE POLICY mark_publication_learner_select
  ON public.mark_publication FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.can_learner_read_mark_entry(mark_entry_id)
  );

CREATE POLICY mark_publication_service_all
  ON public.mark_publication FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
