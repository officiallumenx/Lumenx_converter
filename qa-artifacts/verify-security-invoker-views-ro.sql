-- Read-only verification: blueprint views use security_invoker=true
SELECT
  c.relname AS view_name,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname IN (
    'diary_submission',
    'role_permission',
    'trip',
    'boarding_event',
    'emergency',
    'attendance_pending',
    'platform_readonly_state',
    'fee_dues',
    'subscription_quote',
    'payment_receipt',
    'attendance_daily_summary',
    'institute_people_counts',
    'transport_trip_today',
    'notification_unread_counts',
    'careers_open_jobs',
    'mark_publication_current'
  )
ORDER BY c.relname;
