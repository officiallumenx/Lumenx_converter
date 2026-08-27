-- =============================================================================
-- LumenX Migration 037 — Recycle bin RLS retention filter
-- Version: 20260827341000
--
-- Hide expired in_bin rows from authenticated SELECT (match API 90-day list/get).
-- =============================================================================

DROP POLICY IF EXISTS recycle_item_select_scoped ON public.recycle_item;

CREATE POLICY recycle_item_select_scoped
  ON public.recycle_item FOR SELECT TO authenticated
  USING (
    (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
    )
    AND (
      status <> 'in_bin'
      OR deleted_at >= (now() - interval '90 days')
    )
  );
