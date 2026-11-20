-- Read-only: remaining public views without security_invoker=true
-- (same condition the Security Definer View dashboard lint uses)
SELECT
  c.relname AS view_name,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND NOT COALESCE(c.reloptions, ARRAY[]::text[]) @> ARRAY['security_invoker=true']
ORDER BY c.relname;
