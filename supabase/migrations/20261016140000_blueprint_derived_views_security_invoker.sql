-- =============================================================================
-- LumenX Migration — Blueprint derived views: security_invoker
-- Version: 20261016140000
--
-- Fixes Supabase lint "Security Definer View" on derived reporting views created
-- by 20260905152000_blueprint_derived_views.sql without security_invoker.
-- (That migration's comment incorrectly assumed INVOKER was the Postgres default.)
--
-- Recreates the same SELECT projections with:
--   WITH (security_invoker = true)
-- so callers evaluate underlying-table privileges and RLS as themselves.
-- Grants/comments unchanged (least privilege; no broader access).
-- =============================================================================

-- 1. attendance_pending
CREATE OR REPLACE VIEW public.attendance_pending
  WITH (security_invoker = true)
AS
SELECT
  s.institute_id,
  s.academic_year_id,
  s.class_id,
  s.id         AS section_id,
  CURRENT_DATE AS expected_date
FROM public.section s
WHERE s.deleted_at IS NULL
  AND s.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.attendance_register ar
    WHERE ar.section_id = s.id
      AND ar.institute_id = s.institute_id
      AND ar.attendance_date = CURRENT_DATE
      AND ar.status = 'submitted'
      AND ar.deleted_at IS NULL
  );

COMMENT ON VIEW public.attendance_pending IS 'Sections with no submitted attendance register for today. Approximate; useful for ops dashboards.';

REVOKE ALL ON public.attendance_pending FROM anon, authenticated;
GRANT SELECT ON public.attendance_pending TO authenticated;
GRANT SELECT ON public.attendance_pending TO service_role;

-- 2. platform_readonly_state
CREATE OR REPLACE VIEW public.platform_readonly_state
  WITH (security_invoker = true)
AS
SELECT
  sub.institute_id,
  sub.lifecycle_status,
  sp.ends_at AS current_period_ends_at,
  sub.grace_ends_at
FROM public.subscription sub
LEFT JOIN public.subscription_period sp
  ON sp.id = sub.current_period_id
  AND sp.institute_id = sub.institute_id
  AND sp.deleted_at IS NULL
WHERE sub.deleted_at IS NULL
  AND sub.lifecycle_status IN ('read_only', 'trial_expired');

COMMENT ON VIEW public.platform_readonly_state IS 'Institutes whose subscription lifecycle implies read_only access. Platform ops view.';

REVOKE ALL ON public.platform_readonly_state FROM anon, authenticated;
GRANT SELECT ON public.platform_readonly_state TO service_role;

-- 3. fee_dues
CREATE OR REPLACE VIEW public.fee_dues
  WITH (security_invoker = true)
AS
SELECT
  sf.id            AS student_fee_id,
  sf.institute_id,
  sf.fee_plan_id,
  sf.student_id,
  sf.billed_amount,
  sf.paid_amount,
  (sf.billed_amount - sf.paid_amount) AS balance_due,
  sf.status
FROM public.student_fee sf
WHERE sf.deleted_at IS NULL
  AND sf.billed_amount > sf.paid_amount;

COMMENT ON VIEW public.fee_dues IS 'Student fee rows with outstanding balance (billed - paid > 0). Staff-safe via underlying RLS.';

REVOKE ALL ON public.fee_dues FROM anon, authenticated;
GRANT SELECT ON public.fee_dues TO authenticated;
GRANT SELECT ON public.fee_dues TO service_role;

-- 4. subscription_quote
CREATE OR REPLACE VIEW public.subscription_quote
  WITH (security_invoker = true)
AS
SELECT
  sub.id               AS subscription_id,
  sub.institute_id,
  sub.active_student_count,
  sub.assigned_rate_inr,
  (sub.active_student_count * sub.assigned_rate_inr) AS quoted_amount_inr,
  sub.lifecycle_status,
  sp.starts_at AS current_period_starts_at,
  sp.ends_at   AS current_period_ends_at
FROM public.subscription sub
LEFT JOIN public.subscription_period sp
  ON sp.id = sub.current_period_id
  AND sp.institute_id = sub.institute_id
  AND sp.deleted_at IS NULL
WHERE sub.deleted_at IS NULL;

COMMENT ON VIEW public.subscription_quote IS 'Derived quote snapshot: active_student_count × assigned_rate. Platform ops only.';

REVOKE ALL ON public.subscription_quote FROM anon, authenticated;
GRANT SELECT ON public.subscription_quote TO service_role;

-- 5. payment_receipt
CREATE OR REPLACE VIEW public.payment_receipt
  WITH (security_invoker = true)
AS
SELECT
  fp.id,
  fp.institute_id,
  fp.fee_plan_id,
  fp.student_fee_id,
  fp.student_id,
  fp.amount,
  fp.method,
  fp.receipt_no,
  fp.paid_on,
  fp.note,
  fp.recorded_by_user_id,
  fp.created_at
FROM public.fee_payment fp
WHERE fp.deleted_at IS NULL;

COMMENT ON VIEW public.payment_receipt IS 'Recorded fee payments. Exposes non-deleted fee_payment rows for receipt/report use.';

REVOKE ALL ON public.payment_receipt FROM anon, authenticated;
GRANT SELECT ON public.payment_receipt TO authenticated;
GRANT SELECT ON public.payment_receipt TO service_role;

-- 6. attendance_daily_summary
CREATE OR REPLACE VIEW public.attendance_daily_summary
  WITH (security_invoker = true)
AS
SELECT
  ar.institute_id,
  ar.section_id,
  ar.attendance_date,
  count(*)                                              AS total_marks,
  count(*) FILTER (WHERE am.status = 'present')         AS present_count,
  count(*) FILTER (WHERE am.status = 'absent')          AS absent_count,
  count(*) FILTER (WHERE am.status = 'leave')           AS leave_count
FROM public.attendance_register ar
JOIN public.attendance_mark am
  ON am.register_id = ar.id
  AND am.institute_id = ar.institute_id
  AND am.deleted_at IS NULL
WHERE ar.deleted_at IS NULL
  AND ar.status = 'submitted'
GROUP BY ar.institute_id, ar.section_id, ar.attendance_date;

COMMENT ON VIEW public.attendance_daily_summary IS 'Daily attendance counts per institute/section/date from submitted registers.';

REVOKE ALL ON public.attendance_daily_summary FROM anon, authenticated;
GRANT SELECT ON public.attendance_daily_summary TO authenticated;
GRANT SELECT ON public.attendance_daily_summary TO service_role;

-- 7. institute_people_counts
CREATE OR REPLACE VIEW public.institute_people_counts
  WITH (security_invoker = true)
AS
SELECT
  i.id AS institute_id,
  (SELECT count(*) FROM public.student st WHERE st.institute_id = i.id AND st.deleted_at IS NULL AND st.status = 'active') AS student_count,
  (SELECT count(*) FROM public.teacher t  WHERE t.institute_id  = i.id AND t.deleted_at  IS NULL AND t.status  = 'active') AS teacher_count,
  (SELECT count(*) FROM public.parent  p  WHERE p.institute_id  = i.id AND p.deleted_at  IS NULL AND p.access_status = 'active') AS parent_count
FROM public.institute i
WHERE i.deleted_at IS NULL;

COMMENT ON VIEW public.institute_people_counts IS 'Active student/teacher/parent counts per institute. Light dashboard helper.';

REVOKE ALL ON public.institute_people_counts FROM anon, authenticated;
GRANT SELECT ON public.institute_people_counts TO authenticated;
GRANT SELECT ON public.institute_people_counts TO service_role;

-- 8. transport_trip_today
CREATE OR REPLACE VIEW public.transport_trip_today
  WITH (security_invoker = true)
AS
SELECT *
FROM public.transport_trip
WHERE deleted_at IS NULL
  AND trip_date = CURRENT_DATE;

COMMENT ON VIEW public.transport_trip_today IS 'Today''s active transport trips. Light ops view.';

REVOKE ALL ON public.transport_trip_today FROM anon, authenticated;
GRANT SELECT ON public.transport_trip_today TO authenticated;
GRANT SELECT ON public.transport_trip_today TO service_role;

-- 9. notification_unread_counts
CREATE OR REPLACE VIEW public.notification_unread_counts
  WITH (security_invoker = true)
AS
SELECT
  nr.user_profile_id,
  count(*) AS unread_count
FROM public.notification_recipient nr
WHERE nr.deleted_at IS NULL
  AND nr.read_at IS NULL
GROUP BY nr.user_profile_id;

COMMENT ON VIEW public.notification_unread_counts IS 'Unread notification counts per user_profile. Uses read_at IS NULL.';

REVOKE ALL ON public.notification_unread_counts FROM anon, authenticated;
GRANT SELECT ON public.notification_unread_counts TO authenticated;
GRANT SELECT ON public.notification_unread_counts TO service_role;

-- 10. careers_open_jobs
CREATE OR REPLACE VIEW public.careers_open_jobs
  WITH (security_invoker = true)
AS
SELECT
  cj.id,
  cj.institute_id,
  cj.title,
  cj.slug,
  cj.description,
  cj.category,
  cj.employment_type,
  cj.work_mode,
  cj.location_label,
  cj.openings_count,
  cj.created_by_user_id,
  cj.created_at
FROM public.career_job cj
WHERE cj.deleted_at IS NULL
  AND cj.status = 'open';

COMMENT ON VIEW public.careers_open_jobs IS 'Active (open) career job listings. Blueprint secondary view.';

REVOKE ALL ON public.careers_open_jobs FROM anon, authenticated;
GRANT SELECT ON public.careers_open_jobs TO authenticated;
GRANT SELECT ON public.careers_open_jobs TO service_role;

-- 11. mark_publication_current
CREATE OR REPLACE VIEW public.mark_publication_current
  WITH (security_invoker = true)
AS
SELECT DISTINCT ON (mp.mark_entry_id)
  mp.*
FROM public.mark_publication mp
WHERE mp.deleted_at IS NULL
ORDER BY mp.mark_entry_id, mp.published_at DESC;

COMMENT ON VIEW public.mark_publication_current IS 'Latest (most recent) publication per mark_entry. Useful for current status dashboards.';

REVOKE ALL ON public.mark_publication_current FROM anon, authenticated;
GRANT SELECT ON public.mark_publication_current TO authenticated;
GRANT SELECT ON public.mark_publication_current TO service_role;
