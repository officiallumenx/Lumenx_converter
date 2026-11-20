-- =============================================================================
-- LumenX Migration — Document sequential numbering (DOC/{year}/{seq})
-- Version: 20261016150000
--
-- Source of review notes / duplicate query / concurrency harness:
--   docs/proposals/document_number_uniqueness.sql
--   docs/proposals/document_number_uniqueness_concurrency_test.sql
--
-- DO NOT APPLY until:
--   1) Target is positively verified as non-production staging
--   2) Read-only duplicate detection returns zero rows (see proposal)
--   3) Explicit operator approval
--
-- Soft-delete / uniqueness: no reuse of historically assigned numbers.
-- Gap policy: stamped-but-unpublished numbers remain reserved (accepted).
-- Sequence invariant: next_sequence is the NEXT integer to issue.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.document_number_series (
  institute_id uuid NOT NULL REFERENCES public.institute (id),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  -- NEXT sequence integer to issue (after allocate N, store N+1).
  next_sequence integer NOT NULL DEFAULT 1 CHECK (next_sequence >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institute_id, year)
);

COMMENT ON TABLE public.document_number_series IS
  'Atomic DOC/{year}/{seq} allocator for generated_document. Separate from issued_certificate.';

COMMENT ON COLUMN public.document_number_series.next_sequence IS
  'Next sequence integer to issue for this institute+year (not last-issued).';

GRANT ALL ON TABLE public.document_number_series TO service_role;

-- Signature must match TypeScript: allocate_document_number({ p_institute_id, p_year }) → text
CREATE OR REPLACE FUNCTION public.allocate_document_number(
  p_institute_id uuid,
  p_year integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
  v_seed integer;
BEGIN
  IF p_institute_id IS NULL OR p_year IS NULL THEN
    RAISE EXCEPTION 'institute_id and year are required';
  END IF;

  -- Floor from ALL historically reserved DOC/{year}/N values (including soft-deleted).
  SELECT COALESCE(MAX(
    NULLIF(substring(gd.certificate_number from '^DOC/[0-9]{4}/([0-9]+)$'), '')::integer
  ), 0) + 1
  INTO v_seed
  FROM public.generated_document gd
  WHERE gd.institute_id = p_institute_id
    AND gd.certificate_number ~ ('^DOC/' || p_year::text || '/[0-9]+$');

  IF v_seed < 1 THEN
    v_seed := 1;
  END IF;

  INSERT INTO public.document_number_series (institute_id, year, next_sequence)
  VALUES (p_institute_id, p_year, v_seed + 1)
  ON CONFLICT (institute_id, year) DO UPDATE
    SET next_sequence =
          GREATEST(public.document_number_series.next_sequence, v_seed) + 1,
        updated_at = now()
  RETURNING (public.document_number_series.next_sequence - 1) INTO v_seq;

  RETURN 'DOC/' || p_year::text || '/' ||
    CASE
      WHEN char_length(v_seq::text) >= 4 THEN v_seq::text
      ELSE lpad(v_seq::text, 4, '0')
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_document_number(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(uuid, integer) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS generated_document_institute_number_uidx
  ON public.generated_document (institute_id, certificate_number)
  WHERE certificate_number IS NOT NULL;
