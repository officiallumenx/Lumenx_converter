-- =============================================================================
-- LumenX Migration — Materialized rollup views (blueprint V2)
-- Version: 20260905153000
--
-- Materialized views (4):
--   mv_attendance_monthly
--   mv_fee_collection_monthly
--   mv_platform_network_metrics
--   mv_institute_kpi_snapshot
--
-- Each has a unique index for future CONCURRENT refresh.
-- refresh_blueprint_rollups() refreshes all four.
-- =============================================================================

-- 1. mv_attendance_monthly
CREATE MATERIALIZED VIEW public.mv_attendance_monthly AS
SELECT
  ar.institute_id,
  to_char(ar.attendance_date, 'YYYY-MM') AS year_month,
  count(*) FILTER (WHERE am.status = 'present') AS present_count,
  count(*) FILTER (WHERE am.status = 'absent')  AS absent_count,
  count(*)                                       AS mark_count
FROM public.attendance_register ar
JOIN public.attendance_mark am
  ON am.register_id = ar.id
  AND am.institute_id = ar.institute_id
  AND am.deleted_at IS NULL
WHERE ar.deleted_at IS NULL
  AND ar.status = 'submitted'
GROUP BY ar.institute_id, to_char(ar.attendance_date, 'YYYY-MM')
WITH NO DATA;

CREATE UNIQUE INDEX mv_attendance_monthly_uidx
  ON public.mv_attendance_monthly (institute_id, year_month);

COMMENT ON MATERIALIZED VIEW public.mv_attendance_monthly IS 'Monthly attendance rollup per institute. Refresh via refresh_blueprint_rollups().';

GRANT SELECT ON public.mv_attendance_monthly TO service_role;

-- 2. mv_fee_collection_monthly
CREATE MATERIALIZED VIEW public.mv_fee_collection_monthly AS
SELECT
  fp.institute_id,
  to_char(fp.paid_on, 'YYYY-MM') AS year_month,
  sum(fp.amount)                  AS collected_inr,
  count(*)                        AS payment_count
FROM public.fee_payment fp
WHERE fp.deleted_at IS NULL
GROUP BY fp.institute_id, to_char(fp.paid_on, 'YYYY-MM')
WITH NO DATA;

CREATE UNIQUE INDEX mv_fee_collection_monthly_uidx
  ON public.mv_fee_collection_monthly (institute_id, year_month);

COMMENT ON MATERIALIZED VIEW public.mv_fee_collection_monthly IS 'Monthly fee collection rollup per institute. Refresh via refresh_blueprint_rollups().';

GRANT SELECT ON public.mv_fee_collection_monthly TO service_role;

-- 3. mv_platform_network_metrics — per-institute lifecycle/plan summary
CREATE MATERIALIZED VIEW public.mv_platform_network_metrics AS
SELECT
  sub.institute_id,
  sub.lifecycle_status,
  lic.plan,
  sub.active_student_count,
  sub.assigned_rate_inr
FROM public.subscription sub
LEFT JOIN public.license lic
  ON lic.institute_id = sub.institute_id
  AND lic.deleted_at IS NULL
WHERE sub.deleted_at IS NULL
WITH NO DATA;

CREATE UNIQUE INDEX mv_platform_network_metrics_uidx
  ON public.mv_platform_network_metrics (institute_id);

COMMENT ON MATERIALIZED VIEW public.mv_platform_network_metrics IS 'Per-institute lifecycle + plan snapshot for platform ops. Refresh via refresh_blueprint_rollups().';

GRANT SELECT ON public.mv_platform_network_metrics TO service_role;

-- 4. mv_institute_kpi_snapshot — per-institute KPIs
CREATE MATERIALIZED VIEW public.mv_institute_kpi_snapshot AS
SELECT
  i.id AS institute_id,
  (SELECT count(*) FROM public.student st
   WHERE st.institute_id = i.id AND st.deleted_at IS NULL AND st.status = 'active')   AS student_count,
  (SELECT count(*) FROM public.teacher t
   WHERE t.institute_id = i.id AND t.deleted_at IS NULL AND t.status = 'active')      AS teacher_count,
  (SELECT count(*) FROM public.complaint c
   WHERE c.institute_id = i.id AND c.deleted_at IS NULL AND c.status = 'pending')     AS open_complaints,
  (SELECT count(*) FROM public.transport_trip tt
   WHERE tt.institute_id = i.id AND tt.deleted_at IS NULL
     AND tt.trip_date = CURRENT_DATE AND tt.finalized = false)                         AS active_trips_today
FROM public.institute i
WHERE i.deleted_at IS NULL
WITH NO DATA;

CREATE UNIQUE INDEX mv_institute_kpi_snapshot_uidx
  ON public.mv_institute_kpi_snapshot (institute_id);

COMMENT ON MATERIALIZED VIEW public.mv_institute_kpi_snapshot IS 'Per-institute KPI snapshot: students, teachers, open complaints, active trips today. Refresh via refresh_blueprint_rollups().';

GRANT SELECT ON public.mv_institute_kpi_snapshot TO service_role;

-- =============================================================================
-- Refresh function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.refresh_blueprint_rollups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_attendance_monthly;
  REFRESH MATERIALIZED VIEW public.mv_fee_collection_monthly;
  REFRESH MATERIALIZED VIEW public.mv_platform_network_metrics;
  REFRESH MATERIALIZED VIEW public.mv_institute_kpi_snapshot;
END;
$$;

COMMENT ON FUNCTION public.refresh_blueprint_rollups() IS 'Refresh all blueprint materialized rollup views. Non-concurrent; safe for V1.';

REVOKE ALL ON FUNCTION public.refresh_blueprint_rollups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_blueprint_rollups() TO service_role;
