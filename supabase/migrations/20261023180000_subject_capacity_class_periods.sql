-- =============================================================================
-- LumenX Migration — Subject capacity + per-class periods
-- Version: 20261023180000
--
-- Extends subject catalog:
--   capacity       — optional seat/enrollment capacity (create form)
--   class_periods  — jsonb map of class_code → periods_per_week (edit form)
--
-- Legacy: empty class_periods {} falls back to subject.periods_per_week.
-- Do not apply to production without authorization.
-- Denylist reminder: kmpzflsurepjwqnfqyld
-- =============================================================================

ALTER TABLE public.subject
  ADD COLUMN IF NOT EXISTS capacity integer NULL;

ALTER TABLE public.subject
  ADD COLUMN IF NOT EXISTS class_periods jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subject_capacity_check'
  ) THEN
    ALTER TABLE public.subject
      ADD CONSTRAINT subject_capacity_check
      CHECK (capacity IS NULL OR capacity >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.subject.capacity IS
  'Optional catalog capacity (e.g. elective seats). Null = unset.';

COMMENT ON COLUMN public.subject.class_periods IS
  'Per-class periods/week overrides: {"6":4,"7":5}. Missing keys fall back to periods_per_week.';
