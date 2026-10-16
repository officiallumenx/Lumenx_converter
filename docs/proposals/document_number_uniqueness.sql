-- PROPOSED / operator notes — do not apply without explicit approval.
-- Canonical migration copy (still gated): supabase/migrations/20261016150000_document_number_uniqueness.sql
-- Document sequential numbering: series table + atomic RPC + uniqueness.
--
-- Soft-delete / uniqueness policy (NO REUSE):
--   Once a certificate_number is assigned on generated_document (including
--   soft-deleted rows), it remains reserved for that institute. Soft-delete
--   does not free the number for a new document.
--
-- Gap policy (ACCEPTED):
--   If allocate_document_number succeeds and the number is stamped on the draft
--   but publication later fails (PDF/storage/update), the number stays reserved
--   on the draft. Retries reuse the stamped number. Gaps are intentional.
--   PDF storage and notifications are outside any DB transaction.
--
-- Prerequisites (run on the TARGET database — never assume repo = live data):
--   1) Run DUPLICATE DETECTION below on staging/production.
--   2) Clean duplicates only with explicit approval (no automatic renumber/delete).
--   3) Apply this migration (series + RPC + GRANT + unique index).
--   4) Deploy API that calls allocate_document_number and fails closed when
--      DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK is unset/false in production.
--
-- Deployment order:
--   A. DUPLICATE DETECTION (read-only) on the target DB.
--   B. Approved cleanup if needed.
--   C. Apply this SQL.
--   D. Verify: SELECT public.allocate_document_number('<institute-uuid>', 2026);
--   E. Deploy/restart API; confirm production does NOT set
--      DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK=true unless intentionally pre-migration.
--
-- Pre-migration API mode (explicit only):
--   DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK=true allows max+1 when the RPC is
--   confirmed missing. That mode is NOT concurrent-safe.
--
-- Behavior after migration:
--   allocate_document_number atomically bumps document_number_series;
--   unique index prevents duplicate reserved numbers (including soft-deleted).
--
-- Sequence invariant (next_sequence):
--   document_number_series.next_sequence is the NEXT integer to issue (not the
--   last issued). After allocating N, the row stores N + 1.
--   Every allocate computes v_seed = max(reserved DOC/{year}/N including
--   soft-deleted) + 1, then issues GREATEST(series.next_sequence, v_seed) so a
--   lagging series row cannot return an already-reserved number. Concurrent
--   callers serialize on the series PK row lock; unique index remains the final
--   duplicate guard on generated_document.

-- ─── 1) Series table (composite key: one sequence per institute + year) ───
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

-- ─── 2) Atomic allocate RPC (service_role / backend) ───
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
  -- Recomputed on every call so a one-time seed cannot race with other publishers.
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

  -- Issue GREATEST(existing next_sequence, v_seed); store issued+1.
  -- INSERT and ON CONFLICT both honor v_seed so a behind series catches up.
  -- Concurrent callers serialize on the (institute_id, year) row lock.
  INSERT INTO public.document_number_series (institute_id, year, next_sequence)
  VALUES (p_institute_id, p_year, v_seed + 1)
  ON CONFLICT (institute_id, year) DO UPDATE
    SET next_sequence =
          GREATEST(public.document_number_series.next_sequence, v_seed) + 1,
        updated_at = now()
  RETURNING (public.document_number_series.next_sequence - 1) INTO v_seq;

  -- Match TypeScript padStart(4,'0'): pad short sequences; never truncate wide ones.
  RETURN 'DOC/' || p_year::text || '/' ||
    CASE
      WHEN char_length(v_seq::text) >= 4 THEN v_seq::text
      ELSE lpad(v_seq::text, 4, '0')
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_document_number(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(uuid, integer) TO service_role;

-- ─── 3) Uniqueness — no reuse after soft-delete ───
-- Any non-null certificate_number is reserved for the institute for the life of the row
-- (including soft-deleted rows). Draft stamps and published rows share this space.
CREATE UNIQUE INDEX IF NOT EXISTS generated_document_institute_number_uidx
  ON public.generated_document (institute_id, certificate_number)
  WHERE certificate_number IS NOT NULL;

-- ─── DUPLICATE DETECTION (read-only — run on TARGET DB before CREATE UNIQUE INDEX) ───
-- Matches the unique index predicate exactly.
-- Location: staging/production Supabase SQL editor or psql against that environment.
-- Do NOT delete/renumber automatically; cleanup requires explicit approval.
/*
SELECT
  institute_id,
  certificate_number,
  COUNT(*) AS row_count,
  array_agg(id ORDER BY created_at) AS generated_document_ids,
  array_agg(workflow_state ORDER BY created_at) AS workflow_states,
  array_agg(deleted_at IS NOT NULL ORDER BY created_at) AS soft_deleted_flags
FROM public.generated_document
WHERE certificate_number IS NOT NULL
GROUP BY institute_id, certificate_number
HAVING COUNT(*) > 1
ORDER BY institute_id, certificate_number;
*/
