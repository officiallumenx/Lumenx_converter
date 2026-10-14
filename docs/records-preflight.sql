-- =============================================================================
-- LumenX Records — READ-ONLY production preflight (operator-run)
-- Migration: 20261014120000_records_retention_transfer.sql
-- Target project must be verified independently (expected: kmpzflsurepjwqnfqyld).
--
-- SAFE: SELECT / metadata only. Does not INSERT/UPDATE/DELETE/DDL.
-- Do not expand to student names, phones, emails, or credentials.
-- =============================================================================

-- 1) Institutes with more than one live active academic year
--    (must return ZERO rows before CREATE UNIQUE INDEX ... status = 'active')
SELECT institute_id, COUNT(*)::int AS active_count
FROM public.academic_year
WHERE deleted_at IS NULL
  AND status = 'active'
GROUP BY institute_id
HAVING COUNT(*) > 1
ORDER BY institute_id;

-- 2) Aggregate year/institute counts (no PII)
SELECT
  (SELECT COUNT(*)::int FROM public.institute WHERE deleted_at IS NULL) AS institutes,
  (SELECT COUNT(*)::int FROM public.academic_year WHERE deleted_at IS NULL AND status = 'active') AS active_years,
  (SELECT COUNT(*)::int FROM public.academic_year WHERE deleted_at IS NULL) AS live_years;

-- 3) Schema prerequisites for the migration
SELECT
  (SELECT COUNT(*)::int FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'student' AND column_name = 'graduated_on') AS has_graduated_on,
  (SELECT COUNT(*)::int FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'student_retention_review') AS has_retention_table,
  (SELECT COUNT(*)::int FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'student_transfer_request') AS has_transfer_table,
  (SELECT COUNT(*)::int FROM pg_proc WHERE proname = 'set_updated_at') AS has_set_updated_at,
  (SELECT COUNT(*)::int FROM pg_proc WHERE proname = 'is_staff_of_institute') AS has_is_staff,
  (SELECT COUNT(*)::int FROM pg_proc WHERE proname = 'is_platform_operator') AS has_is_platform_operator,
  (SELECT COUNT(*)::int FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND table_name = 'student'
       AND constraint_name = 'student_id_institute_key') AS has_student_id_institute_key;

-- 4) Count of graduated students that will need retention review after deploy
--    (counts only; no identity columns)
SELECT COUNT(*)::int AS graduated_students
FROM public.student
WHERE deleted_at IS NULL
  AND status = 'graduated';

-- 5) Confirm migration history does not already include this version
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20261014120000';
