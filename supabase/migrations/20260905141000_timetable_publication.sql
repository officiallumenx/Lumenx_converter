-- =============================================================================
-- LumenX Migration — timetable_publication
-- Version: 20260905141000
--
-- Tables (1):
--   timetable_publication
--
-- Model:
--   timetable_publication — durable publish event for a section's timetable.
--   Persisted when publishSectionTimetableForActor succeeds; captures slot_count
--   and optional publish note.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. timetable_publication
-- -----------------------------------------------------------------------------
CREATE TABLE public.timetable_publication (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  academic_year_id        uuid NOT NULL,
  class_id                uuid NOT NULL,
  section_id              uuid NOT NULL,
  published_at            timestamptz NOT NULL DEFAULT now(),
  published_by_user_id    uuid NOT NULL REFERENCES public.user_profile (id),
  note                    text NULL,
  slot_count              integer NOT NULL DEFAULT 0,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT timetable_publication_slot_count_check CHECK (slot_count >= 0),

  CONSTRAINT timetable_publication_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT timetable_publication_academic_year_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_year (id, institute_id),

  CONSTRAINT timetable_publication_section_graph_fkey
    FOREIGN KEY (section_id, institute_id, academic_year_id, class_id)
    REFERENCES public.section (id, institute_id, academic_year_id, class_id)
);

CREATE INDEX timetable_publication_section_published_idx
  ON public.timetable_publication (institute_id, section_id, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER timetable_publication_set_updated_at
  BEFORE UPDATE ON public.timetable_publication
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.timetable_publication IS 'Durable timetable publish event per section. Soft-delete via deleted_at.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.timetable_publication ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.timetable_publication FROM anon, authenticated;
GRANT SELECT ON public.timetable_publication TO authenticated;

CREATE POLICY timetable_publication_staff_select
  ON public.timetable_publication FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_staff_of_institute(institute_id)
  );

CREATE POLICY timetable_publication_member_select
  ON public.timetable_publication FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_institute_member(institute_id)
  );

CREATE POLICY timetable_publication_service_all
  ON public.timetable_publication FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
