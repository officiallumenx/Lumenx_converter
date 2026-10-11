-- READ-ONLY preflight for all pending prod migrations. Aggregates only — no PII.

SELECT section, detail, n
FROM (
  SELECT 'target_migrations'::text AS section, '20261009180000'::text AS detail,
    CASE WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261009180000') THEN 1 ELSE 0 END::bigint AS n
  UNION ALL
  SELECT 'target_migrations', '20261011140000',
    CASE WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261011140000') THEN 1 ELSE 0 END

  -- Transport unique index already present?
  UNION ALL
  SELECT 'transport_index', COALESCE(indexname, 'missing'), CASE WHEN indexname IS NULL THEN 0 ELSE 1 END
  FROM (SELECT 1) _
  LEFT JOIN pg_indexes i ON i.schemaname='public' AND i.indexname='transport_trip_vehicle_date_slot_live_uidx'

  -- Live duplicate groups (would block migration)
  UNION ALL
  SELECT 'transport_dup_groups', 'live_vehicle_date_slot', COUNT(*)::bigint
  FROM (
    SELECT vehicle_id, trip_date, slot
    FROM public.transport_trip
    WHERE deleted_at IS NULL
    GROUP BY vehicle_id, trip_date, slot
    HAVING COUNT(*) > 1
  ) d

  -- Sample duplicate key counts only (no student names); truncate vehicle ids
  UNION ALL
  SELECT 'transport_dup_sample',
         left(vehicle_id::text, 8) || '…|' || trip_date::text || '|' || slot::text,
         cnt
  FROM (
    SELECT vehicle_id, trip_date, slot, COUNT(*)::bigint AS cnt
    FROM public.transport_trip
    WHERE deleted_at IS NULL
    GROUP BY vehicle_id, trip_date, slot
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) s

  UNION ALL
  SELECT 'transport_trip_counts', 'live', COUNT(*)::bigint FROM public.transport_trip WHERE deleted_at IS NULL
  UNION ALL
  SELECT 'transport_trip_counts', 'total', COUNT(*)::bigint FROM public.transport_trip

  -- Certificate / template checks
  UNION ALL
  SELECT 'layout_mode', COALESCE(layout_mode::text,'<null>'), COUNT(*)::bigint
  FROM public.template GROUP BY layout_mode
  UNION ALL
  SELECT 'layout_mode_incompatible', 'count', COUNT(*)::bigint
  FROM public.template
  WHERE layout_mode IS NULL OR layout_mode NOT IN ('blocks','visual','pptx')
  UNION ALL
  SELECT 'column_missing', x.col, 0
  FROM (VALUES ('family_id'),('asset_path'),('file_name'),('file_byte_size'),('file_content_type'),('pptx_meta')) AS x(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name='template' AND c.column_name=x.col
  )
  UNION ALL
  SELECT 'template_counts', 'total', COUNT(*)::bigint FROM public.template
  UNION ALL
  SELECT 'bucket', CASE WHEN id IS NULL THEN 'missing' ELSE format('public=%s;limit=%s', public, file_size_limit) END,
         CASE WHEN id IS NULL THEN 0 ELSE 1 END
  FROM (SELECT 1) _
  LEFT JOIN storage.buckets b ON b.id='certificate-templates'
) q
ORDER BY section, detail;
