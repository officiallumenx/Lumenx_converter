-- READ-ONLY Phase 3 reconciliation. No DDL/DML. Staging only: yveadybpntziyryxsrsu

-- 1) Soft identity: staging transport institutes (expect LX-E2E-* / lx-staging-transport-rt)
SELECT 'identity_institutes' AS section,
       i.code,
       i.id::text AS id,
       i.name
FROM public.institute i
WHERE i.deleted_at IS NULL
  AND (
    i.code ILIKE 'LX-E2E%'
    OR i.code ILIKE 'lx-staging%'
  )
ORDER BY i.code;

-- 2) Migration history tip + target version
-- Note: staging schema_migrations columns are version, statements, name (no inserted_at).
SELECT 'migration_history_tip' AS section,
       version,
       name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 40;

SELECT 'migration_target_version' AS section,
       version,
       name
FROM supabase_migrations.schema_migrations
WHERE version = '20261020160000'
   OR version LIKE '20261020%'
   OR name ILIKE '%vehicle_location%guardian%'
   OR name ILIKE '%can_learner_read_vehicle_location%'
   OR name ILIKE '%guardian_realtime%';

SELECT 'migration_phase9' AS section,
       version,
       name
FROM supabase_migrations.schema_migrations
WHERE version = '20261006020000'
   OR name ILIKE '%phase9%';

-- 3) Function owner / definer / search_path / definition markers
SELECT 'function_meta' AS section,
       p.proname,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       p.proconfig::text AS config,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'can_learner_read_vehicle_location';

SELECT 'function_def' AS section,
       pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'can_learner_read_vehicle_location';

-- 4) EXECUTE grants
SELECT 'function_grants' AS section,
       grantee,
       privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'can_learner_read_vehicle_location'
ORDER BY grantee, privilege_type;

-- 5) Policy USING expression
SELECT 'policy' AS section,
       pol.polname,
       pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
FROM pg_policy pol
WHERE pol.polrelid = 'public.vehicle_location'::regclass
  AND pol.polname = 'vehicle_location_select_scoped';

-- 6) Realtime publication
SELECT 'publication' AS section,
       pub.pubname,
       pt.schemaname,
       pt.tablename
FROM pg_publication pub
JOIN pg_publication_tables pt ON pt.pubname = pub.pubname
WHERE pt.tablename = 'vehicle_location'
ORDER BY pub.pubname;
