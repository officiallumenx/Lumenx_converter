-- MANUAL STAGING / LOCAL Postgres procedure — not applied by CI.
-- Run ONLY after document_number_uniqueness.sql has been applied.
-- Use a disposable / throwaway staging institute. Do NOT run against production.
--
-- This is an ACTUAL database concurrency check. It is separate from the Vitest
-- unit/mock suite under backend/src/domains/documents/*.test.ts.
--
-- Isolation:
--   • Throwaway institute only (set institute_id below).
--   • Fixed test year 2099 (within document_number_series year CHECK).
--   • Probe rows titled DOCNUM-CONCURRENCY-% only.
--
-- Prerequisites (all required — script aborts if missing):
--   1) document_number_series + allocate_document_number + unique index exist.
--   2) Caller can EXECUTE allocate_document_number (service_role / superuser).
--   3) \set institute_id to a throwaway institute uuid that has at least one
--      non-deleted template and the DB has at least one user_profile.
--   4) psql with ON_ERROR_STOP (set below).
--
-- What it verifies (aligned with document_number_uniqueness.sql):
--   A) Missing series + reserved 0001 + soft-deleted 0002 → DOC/2099/0003,
--      then that number is stamped into generated_document (reserved).
--   B) Series next_sequence forced behind → allocate catches up to DOC/2099/0004
--      (v_seed sees stamped 0003).
--   C) Series ahead of reserved seed → DOC/2099/0050.
--   D) (Outside txn) Concurrent allocates produce distinct DOC numbers.
--
-- Cases A–C run inside BEGIN…ROLLBACK so probe rows/series for 2099 are discarded.
-- Case D must run in separate sessions after ROLLBACK; cleanup notes at bottom.

\set ON_ERROR_STOP on

-- REQUIRED: replace with your throwaway staging institute uuid, then run this file.
\set institute_id 'REPLACE_WITH_THROWAWAY_INSTITUTE_UUID'

-- Fixed isolation year — do not change (keeps probes off real calendar years).
\set test_year 2099

-- Fail fast outside DO blocks (psql :variables are not expanded inside $body$).
SELECT CASE
  WHEN :'institute_id' = 'REPLACE_WITH_THROWAWAY_INSTITUTE_UUID' THEN (1 / 0)
  ELSE 1
END AS _docnum_institute_id_set;

SELECT CASE
  WHEN :test_year = 2099 THEN 1
  ELSE (1 / 0)
END AS _docnum_test_year_ok;

-- Resolve fixtures once; abort if institute / template / user_profile is missing.
DROP TABLE IF EXISTS _docnum_concurrency_guard;
CREATE TEMP TABLE _docnum_concurrency_guard AS
SELECT
  i.id AS institute_id,
  t.id AS template_id,
  u.id AS user_id
FROM public.institute i
INNER JOIN public.template t
  ON t.institute_id = i.id
 AND t.deleted_at IS NULL
CROSS JOIN LATERAL (
  SELECT up.id
  FROM public.user_profile up
  WHERE up.deleted_at IS NULL
  LIMIT 1
) u
WHERE i.id = :'institute_id'::uuid
  AND i.deleted_at IS NULL
LIMIT 1;

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _docnum_concurrency_guard) THEN
    RAISE EXCEPTION
      'docnum concurrency test: missing fixtures (need live throwaway institute, a non-deleted template for that institute, and a user_profile)';
  END IF;
END;
$guard$;

BEGIN;

-- Cleanup prior probe leftovers for this throwaway institute + year 2099 only.
DELETE FROM public.document_number_series
WHERE institute_id = :'institute_id'::uuid
  AND year = 2099;

DELETE FROM public.generated_document
WHERE institute_id = :'institute_id'::uuid
  AND title LIKE 'DOCNUM-CONCURRENCY-%'
  AND (
    certificate_number LIKE 'DOC/2099/%'
    OR certificate_number IS NULL
  );

-- Seed reserved numbers: live 0001 + soft-deleted 0002 (no-reuse / soft-delete policy).
INSERT INTO public.generated_document (
  institute_id, template_id, type, title, recipient_name, status, workflow_state,
  certificate_number, generated_by_user_id, deleted_at
)
SELECT
  g.institute_id,
  g.template_id,
  'certificate',
  'DOCNUM-CONCURRENCY-A1',
  'Probe',
  'ready',
  'published',
  'DOC/2099/0001',
  g.user_id,
  NULL
FROM _docnum_concurrency_guard g;

INSERT INTO public.generated_document (
  institute_id, template_id, type, title, recipient_name, status, workflow_state,
  certificate_number, generated_by_user_id, deleted_at
)
SELECT
  g.institute_id,
  g.template_id,
  'certificate',
  'DOCNUM-CONCURRENCY-A2-SOFT',
  'Probe',
  'ready',
  'published',
  'DOC/2099/0002',
  g.user_id,
  now()
FROM _docnum_concurrency_guard g;

-- Draft row used to stamp allocator output into generated_document (reserves the number).
INSERT INTO public.generated_document (
  institute_id, template_id, type, title, recipient_name, status, workflow_state,
  certificate_number, generated_by_user_id, deleted_at
)
SELECT
  g.institute_id,
  g.template_id,
  'certificate',
  'DOCNUM-CONCURRENCY-STAMP',
  'Probe',
  'ready',
  'draft',
  NULL,
  g.user_id,
  NULL
FROM _docnum_concurrency_guard g;

DO $fixtures$
DECLARE
  n int;
BEGIN
  SELECT count(*)::int INTO n
  FROM public.generated_document
  WHERE institute_id = (SELECT institute_id FROM _docnum_concurrency_guard)
    AND title LIKE 'DOCNUM-CONCURRENCY-%';

  IF n <> 3 THEN
    RAISE EXCEPTION
      'docnum concurrency test: expected 3 probe rows after seed, found %', n;
  END IF;
END;
$fixtures$;

-- ─── A) Missing series + reserved (incl. soft-deleted) → DOC/2099/0003, then stamp ───
DO $case_a$
DECLARE
  v_inst uuid;
  v_got text;
BEGIN
  SELECT institute_id INTO STRICT v_inst FROM _docnum_concurrency_guard;

  v_got := public.allocate_document_number(v_inst, 2099);
  IF v_got IS DISTINCT FROM 'DOC/2099/0003' THEN
    RAISE EXCEPTION 'Case A expected DOC/2099/0003, got %', v_got;
  END IF;

  -- Allocator alone does not reserve; stamp so v_seed includes 0003 (publish-path semantics).
  UPDATE public.generated_document
  SET certificate_number = v_got,
      updated_at = now()
  WHERE institute_id = v_inst
    AND title = 'DOCNUM-CONCURRENCY-STAMP'
    AND certificate_number IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case A: failed to stamp DOC/2099/0003 onto DOCNUM-CONCURRENCY-STAMP';
  END IF;
END;
$case_a$;

-- ─── B) Lagging series (next_sequence=1) must catch up past stamped 0003 → 0004 ───
UPDATE public.document_number_series
SET next_sequence = 1,
    updated_at = now()
WHERE institute_id = :'institute_id'::uuid
  AND year = 2099;

DO $case_b$
DECLARE
  v_inst uuid;
  v_got text;
BEGIN
  SELECT institute_id INTO STRICT v_inst FROM _docnum_concurrency_guard;

  -- v_seed = max(1,2,3)+1 = 4; GREATEST(series=1, 4) → issue 4.
  v_got := public.allocate_document_number(v_inst, 2099);
  IF v_got IS DISTINCT FROM 'DOC/2099/0004' THEN
    RAISE EXCEPTION 'Case B expected DOC/2099/0004 (catch-up past stamped 0003), got %', v_got;
  END IF;
END;
$case_b$;

-- ─── C) Series ahead of reserved seed → issue from series (0050) ───
UPDATE public.document_number_series
SET next_sequence = 50,
    updated_at = now()
WHERE institute_id = :'institute_id'::uuid
  AND year = 2099;

DO $case_c$
DECLARE
  v_inst uuid;
  v_got text;
BEGIN
  SELECT institute_id INTO STRICT v_inst FROM _docnum_concurrency_guard;

  -- Reserved max still 0003 (0004 from B was not stamped); v_seed=4; GREATEST(50,4)=50.
  v_got := public.allocate_document_number(v_inst, 2099);
  IF v_got IS DISTINCT FROM 'DOC/2099/0050' THEN
    RAISE EXCEPTION 'Case C expected DOC/2099/0050 (series ahead), got %', v_got;
  END IF;
END;
$case_c$;

-- Discard all A–C probe rows and series mutations for year 2099.
ROLLBACK;

-- ─── D) Concurrent check (OUTSIDE the rolled-back transaction) ───
-- Run in two psql sessions at the same time against the same throwaway institute:
--
--   SELECT public.allocate_document_number('<throwaway-institute-uuid>', 2099);
--
-- Expected: two distinct values (e.g. DOC/2099/0001 and DOC/2099/0002).
-- Optional: INSERT both into generated_document; unique index must accept both
-- and reject a third insert of a duplicate certificate_number.
--
-- Cleanup after D (series bumps persist; no ROLLBACK):
--   DELETE FROM public.document_number_series
--   WHERE institute_id = '<throwaway-institute-uuid>' AND year = 2099;
--   DELETE FROM public.generated_document
--   WHERE institute_id = '<throwaway-institute-uuid>'
--     AND title LIKE 'DOCNUM-CONCURRENCY-%';
