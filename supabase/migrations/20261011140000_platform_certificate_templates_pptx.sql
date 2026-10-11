-- =============================================================================
-- LumenX Migration — Platform certificate templates (PPTX source of truth)
-- Version: 20261011140000
--
-- Additive only. Extends public.template for Nexus PPTX catalog metadata and
-- adds a private Storage bucket for PPTX bytes.
--
-- Platform files are referenced by template.asset_path (not stored_asset),
-- because stored_asset.institute_id is NOT NULL and platform rows have no institute.
--
-- Hono service_role remains the write path; RLS SELECT stays defense-in-depth.
-- Do NOT apply to hosted production without explicit owner approval.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. template: layout_mode allows pptx
-- -----------------------------------------------------------------------------
ALTER TABLE public.template
  DROP CONSTRAINT IF EXISTS template_layout_mode_check;

ALTER TABLE public.template
  ADD CONSTRAINT template_layout_mode_check CHECK (
    layout_mode IN ('blocks', 'visual', 'pptx')
  );

-- -----------------------------------------------------------------------------
-- 2. template: versioning + file pointer + pptx metadata
-- -----------------------------------------------------------------------------
ALTER TABLE public.template
  ADD COLUMN IF NOT EXISTS family_id uuid,
  ADD COLUMN IF NOT EXISTS asset_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_byte_size bigint,
  ADD COLUMN IF NOT EXISTS file_content_type text,
  ADD COLUMN IF NOT EXISTS pptx_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.template
SET family_id = id
WHERE family_id IS NULL;

ALTER TABLE public.template
  ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE public.template
  DROP CONSTRAINT IF EXISTS template_file_byte_size_check;

ALTER TABLE public.template
  ADD CONSTRAINT template_file_byte_size_check CHECK (
    file_byte_size IS NULL OR file_byte_size >= 0
  );

ALTER TABLE public.template
  DROP CONSTRAINT IF EXISTS template_pptx_meta_is_object;

ALTER TABLE public.template
  ADD CONSTRAINT template_pptx_meta_is_object CHECK (
    jsonb_typeof(pptx_meta) = 'object'
  );

CREATE INDEX IF NOT EXISTS template_family_id_idx
  ON public.template (family_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS template_platform_certificate_idx
  ON public.template (owner_scope, type, status)
  WHERE deleted_at IS NULL
    AND owner_scope = 'platform'
    AND type = 'certificate';

COMMENT ON COLUMN public.template.family_id IS
  'Groups version snapshots of one logical certificate template. Defaults to id.';

COMMENT ON COLUMN public.template.asset_path IS
  'Private Storage object path (platform PPTX under certificate-templates bucket).';

COMMENT ON COLUMN public.template.pptx_meta IS
  'PPTX targets, mappings, and catalog extras for Nexus platform templates.';

-- -----------------------------------------------------------------------------
-- 3. Private Storage bucket for platform PPTX (no anon/authenticated policies)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-templates',
  'certificate-templates',
  false,
  5242880,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/octet-stream'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
