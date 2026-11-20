select has_function_privilege('anon', 'public.can_learner_read_vehicle_location(uuid,uuid)', 'EXECUTE') as anon_execute;
select has_function_privilege('authenticated', 'public.can_learner_read_vehicle_location(uuid,uuid)', 'EXECUTE') as authenticated_execute;
select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='can_learner_read_vehicle_location';
select count(*)::int as policy_count from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='vehicle_location' and p.polname='vehicle_location_select_scoped';
