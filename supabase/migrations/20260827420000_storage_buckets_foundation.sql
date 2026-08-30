-- =============================================================================
-- LumenX Migration — Supabase Storage buckets (Admin assets)
-- Version: 20260827420000
--
-- Buckets align with public.stored_asset.bucket CHECK (20260827330000).
-- All buckets are private — binary access is via Hono service_role only
-- (upload + signed-URL mint). No anon/authenticated Storage policies.
--
-- Out of scope: per-file virus scan, quota enforcement at upload time.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'institute-branding',
    'institute-branding',
    false,
    10485760,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml'
    ]::text[]
  ),
  (
    'student-media',
    'student-media',
    false,
    26214400,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf'
    ]::text[]
  ),
  (
    'certificates',
    'certificates',
    false,
    52428800,
    ARRAY['application/pdf']::text[]
  ),
  (
    'admission-docs',
    'admission-docs',
    false,
    26214400,
    ARRAY[
      'application/pdf',
      'image/png',
      'image/jpeg'
    ]::text[]
  ),
  (
    'career-docs',
    'career-docs',
    false,
    26214400,
    ARRAY[
      'application/pdf',
      'image/png',
      'image/jpeg'
    ]::text[]
  ),
  (
    'generated-documents',
    'generated-documents',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'text/html',
      'text/plain'
    ]::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
