-- Single-result-set read-only catalog verification (staging).
SELECT * FROM (
  SELECT 1 AS ord, 'table_exists'::text AS check_id,
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = 'institute_registration_legal_consent'
         ) THEN 'true' ELSE 'false' END AS detail
  UNION ALL
  SELECT 2, 'rls_enabled',
         CASE WHEN c.relrowsecurity THEN 'true' ELSE 'false' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'institute_registration_legal_consent'
  UNION ALL
  SELECT 3, 'policies',
         coalesce((
           SELECT string_agg(pol.polname, ',' ORDER BY pol.polname)
           FROM pg_policy pol
           JOIN pg_class c ON c.oid = pol.polrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = 'institute_registration_legal_consent'
         ), '')
  UNION ALL
  SELECT 4, 'constraints',
         coalesce((
           SELECT string_agg(con.conname, ',' ORDER BY con.conname)
           FROM pg_constraint con
           JOIN pg_class c ON c.oid = con.conrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = 'institute_registration_legal_consent'
         ), '')
  UNION ALL
  SELECT 5, 'rpc_create_security_definer',
         CASE WHEN p.prosecdef THEN 'true' ELSE 'false' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_institute_registration_with_legal_consent'
  UNION ALL
  SELECT 6, 'rpc_create_search_path',
         coalesce(array_to_string(p.proconfig, ';'), '')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_institute_registration_with_legal_consent'
  UNION ALL
  SELECT 7, 'rpc_resubmit_security_definer',
         CASE WHEN p.prosecdef THEN 'true' ELSE 'false' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'resubmit_institute_registration_with_legal_consent'
  UNION ALL
  SELECT 8, 'rpc_upsert_exists',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'upsert_institute_registration_legal_consent'
         ) THEN 'true' ELSE 'false' END
  UNION ALL
  SELECT 9, 'execute_grantees_create',
         coalesce((
           SELECT string_agg(DISTINCT grantee::text, ',' ORDER BY grantee::text)
           FROM information_schema.routine_privileges
           WHERE routine_schema = 'public'
             AND routine_name = 'create_institute_registration_with_legal_consent'
             AND privilege_type = 'EXECUTE'
         ), '')
  UNION ALL
  SELECT 10, 'execute_grantees_resubmit',
         coalesce((
           SELECT string_agg(DISTINCT grantee::text, ',' ORDER BY grantee::text)
           FROM information_schema.routine_privileges
           WHERE routine_schema = 'public'
             AND routine_name = 'resubmit_institute_registration_with_legal_consent'
             AND privilege_type = 'EXECUTE'
         ), '')
  UNION ALL
  SELECT 11, 'anon_execute_create',
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.routine_privileges
           WHERE routine_schema = 'public'
             AND routine_name = 'create_institute_registration_with_legal_consent'
             AND privilege_type = 'EXECUTE'
             AND grantee::text IN ('anon', 'authenticated', 'PUBLIC')
         ) THEN 'true' ELSE 'false' END
  UNION ALL
  SELECT 12, 'table_grantees',
         coalesce((
           SELECT string_agg(x.g, ',' ORDER BY x.g)
           FROM (
             SELECT DISTINCT (grantee::text || ':' || privilege_type) AS g
             FROM information_schema.role_table_grants
             WHERE table_schema = 'public'
               AND table_name = 'institute_registration_legal_consent'
           ) x
         ), '')
) q
ORDER BY ord;
