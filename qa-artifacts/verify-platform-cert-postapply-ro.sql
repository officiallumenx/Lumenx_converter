-- Post-apply verification for 20261011140000 (read-only aggregates)
SELECT section, detail, n
FROM (
  SELECT 'migration'::text AS section, '20261011140000'::text AS detail,
    CASE WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261011140000') THEN 1 ELSE 0 END::bigint AS n
  UNION ALL
  SELECT 'column', c.column_name, CASE c.is_nullable WHEN 'NO' THEN 1 ELSE 0 END
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='template'
    AND c.column_name IN ('family_id','asset_path','file_name','file_byte_size','file_content_type','pptx_meta')
  UNION ALL
  SELECT 'constraint', con.conname, 1
  FROM pg_constraint con
  WHERE con.conrelid='public.template'::regclass
    AND con.conname IN ('template_layout_mode_check','template_file_byte_size_check','template_pptx_meta_is_object')
  UNION ALL
  SELECT 'index', i.indexname, 1
  FROM pg_indexes i
  WHERE i.schemaname='public' AND i.tablename='template'
    AND i.indexname IN ('template_family_id_idx','template_platform_certificate_idx')
  UNION ALL
  SELECT 'family_id_nulls', 'count', COUNT(*)::bigint FROM public.template WHERE family_id IS NULL
  UNION ALL
  SELECT 'template_intact', 'total', COUNT(*)::bigint FROM public.template
  UNION ALL
  SELECT 'bucket', format('public=%s;limit=%s;mimes=%s', b.public, b.file_size_limit, array_to_string(b.allowed_mime_types,',')), 1
  FROM storage.buckets b WHERE b.id='certificate-templates'
  UNION ALL
  SELECT 'bucket_policies', 'count', COUNT(*)::bigint
  FROM pg_policies p
  WHERE p.schemaname='storage' AND p.tablename='objects'
    AND (
      p.policyname ILIKE '%certificate-template%'
      OR COALESCE(p.qual::text,'') ILIKE '%certificate-templates%'
      OR COALESCE(p.with_check::text,'') ILIKE '%certificate-templates%'
    )
  UNION ALL
  SELECT 'layout_check', pg_get_constraintdef(oid), 1
  FROM pg_constraint
  WHERE conrelid='public.template'::regclass AND conname='template_layout_mode_check'
) q
ORDER BY section, detail;
