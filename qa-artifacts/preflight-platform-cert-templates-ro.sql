-- READ-ONLY preflight for 20261011140000_platform_certificate_templates_pptx
-- Single result set (CLI returns last statement only). Aggregates only — no PII.

SELECT section, detail, n
FROM (
  -- migration history presence
  SELECT 'migration_history'::text AS section,
         '20261011140000_present'::text AS detail,
         CASE WHEN EXISTS (
           SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261011140000'
         ) THEN 1 ELSE 0 END::bigint AS n
  UNION ALL
  SELECT 'migration_history', '20261009180000_present',
         CASE WHEN EXISTS (
           SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261009180000'
         ) THEN 1 ELSE 0 END
  UNION ALL
  -- columns
  SELECT 'column', c.column_name,
         CASE c.is_nullable WHEN 'YES' THEN 1 ELSE 0 END
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'template'
    AND c.column_name IN (
      'family_id','asset_path','file_name','file_byte_size',
      'file_content_type','pptx_meta','layout_mode','id'
    )
  UNION ALL
  SELECT 'column_missing', x.col, 0
  FROM (VALUES
    ('family_id'),('asset_path'),('file_name'),('file_byte_size'),
    ('file_content_type'),('pptx_meta')
  ) AS x(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'template' AND c.column_name = x.col
  )
  UNION ALL
  -- layout_mode values
  SELECT 'layout_mode', COALESCE(t.layout_mode::text, '<null>'), COUNT(*)::bigint
  FROM public.template t
  GROUP BY t.layout_mode
  UNION ALL
  SELECT 'layout_mode_incompatible', 'count', COUNT(*)::bigint
  FROM public.template t
  WHERE t.layout_mode IS NULL OR t.layout_mode NOT IN ('blocks', 'visual', 'pptx')
  UNION ALL
  -- constraints
  SELECT 'constraint', con.conname, 1
  FROM pg_constraint con
  WHERE con.conrelid = 'public.template'::regclass
    AND con.conname IN (
      'template_layout_mode_check',
      'template_file_byte_size_check',
      'template_pptx_meta_is_object'
    )
  UNION ALL
  SELECT 'index', i.indexname, 1
  FROM pg_indexes i
  WHERE i.schemaname = 'public' AND i.tablename = 'template'
    AND i.indexname IN ('template_family_id_idx', 'template_platform_certificate_idx')
  UNION ALL
  -- template counts
  SELECT 'template_counts', 'total', COUNT(*)::bigint FROM public.template
  UNION ALL
  SELECT 'template_counts', 'live', COUNT(*)::bigint FROM public.template WHERE deleted_at IS NULL
  UNION ALL
  SELECT 'template_counts', 'live_platform_certs', COUNT(*)::bigint
  FROM public.template
  WHERE deleted_at IS NULL AND owner_scope = 'platform' AND type = 'certificate'
  UNION ALL
  -- bucket
  SELECT 'bucket',
         CASE WHEN b.id IS NULL THEN 'missing'
              ELSE format('public=%s;limit=%s;mimes=%s', b.public, b.file_size_limit, array_to_string(b.allowed_mime_types, ','))
         END,
         CASE WHEN b.id IS NULL THEN 0 ELSE 1 END
  FROM (SELECT 1) _
  LEFT JOIN storage.buckets b ON b.id = 'certificate-templates'
  UNION ALL
  -- storage policies referencing certificate-templates
  SELECT 'storage_policy', p.policyname || '|' || p.cmd || '|' || p.roles::text, 1
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
    AND (
      p.policyname ILIKE '%certificate-template%'
      OR COALESCE(p.qual::text, '') ILIKE '%certificate-templates%'
      OR COALESCE(p.with_check::text, '') ILIKE '%certificate-templates%'
    )
  UNION ALL
  SELECT 'storage_policy_count_for_bucket', 'matching_policies', COUNT(*)::bigint
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
    AND (
      p.policyname ILIKE '%certificate-template%'
      OR COALESCE(p.qual::text, '') ILIKE '%certificate-templates%'
      OR COALESCE(p.with_check::text, '') ILIKE '%certificate-templates%'
    )
) q
ORDER BY section, detail;
