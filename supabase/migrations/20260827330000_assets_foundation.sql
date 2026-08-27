-- =============================================================================
-- LumenX Migration 035 — Storage assets foundation
-- Version: 20260827330000
--
-- Tables (exactly 1 — step 5.3 / blueprint V1.5 Assets):
--   stored_asset
--
-- Out of scope (defer):
--   Supabase Storage bucket provisioning, signed-URL minting RPCs,
--   multipart upload orchestration, virus scan, storage_quota enforcement,
--   recycle_item restore wiring, CDN public URLs
--
-- Model:
--   Metadata row for a Storage object (bucket + object_path).
--   Binary lives in Storage; Postgres holds reference + ACL hints only.
--   Replaces Admin IndexedDB blob-asset store keys.
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.stored_asset (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  bucket                  text NOT NULL,
  object_path             text NOT NULL,
  category                text NOT NULL,

  file_name               text NULL,
  content_type            text NULL,
  byte_size               bigint NULL,
  checksum                text NULL,

  visibility              text NOT NULL DEFAULT 'institute',
  status                  text NOT NULL DEFAULT 'active',

  linked_entity_kind      text NULL,
  linked_entity_id        uuid NULL,

  owner_user_id           uuid NULL REFERENCES public.user_profile (id),
  created_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT stored_asset_bucket_check CHECK (
    bucket IN (
      'institute-branding',
      'student-media',
      'certificates',
      'admission-docs',
      'career-docs',
      'generated-documents'
    )
  ),
  CONSTRAINT stored_asset_category_check CHECK (
    category IN (
      'logo',
      'avatar',
      'student_photo',
      'id_card',
      'certificate_pdf',
      'admission_doc',
      'career_doc',
      'generated_document',
      'other'
    )
  ),
  CONSTRAINT stored_asset_visibility_check CHECK (
    visibility IN ('private', 'institute', 'staff')
  ),
  CONSTRAINT stored_asset_status_check CHECK (
    status IN ('active', 'pending', 'archived')
  ),
  CONSTRAINT stored_asset_object_path_check CHECK (
    char_length(trim(object_path)) >= 1
  ),
  CONSTRAINT stored_asset_byte_size_check CHECK (
    byte_size IS NULL OR byte_size >= 0
  ),
  CONSTRAINT stored_asset_linked_kind_check CHECK (
    linked_entity_kind IS NULL
    OR linked_entity_kind IN (
      'student',
      'teacher',
      'parent',
      'admission_document',
      'career_application',
      'issued_certificate',
      'generated_document',
      'event',
      'other'
    )
  ),
  CONSTRAINT stored_asset_linked_pair_check CHECK (
    (linked_entity_kind IS NULL AND linked_entity_id IS NULL)
    OR (linked_entity_kind IS NOT NULL AND linked_entity_id IS NOT NULL)
  ),

  CONSTRAINT stored_asset_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX stored_asset_institute_bucket_path_uidx
  ON public.stored_asset (institute_id, bucket, object_path)
  WHERE deleted_at IS NULL;

CREATE INDEX stored_asset_institute_category_idx
  ON public.stored_asset (institute_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX stored_asset_owner_idx
  ON public.stored_asset (owner_user_id)
  WHERE deleted_at IS NULL AND owner_user_id IS NOT NULL;

CREATE INDEX stored_asset_linked_idx
  ON public.stored_asset (institute_id, linked_entity_kind, linked_entity_id)
  WHERE deleted_at IS NULL AND linked_entity_id IS NOT NULL;

CREATE TRIGGER stored_asset_set_updated_at
  BEFORE UPDATE ON public.stored_asset
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.stored_asset IS
  'Metadata for a Supabase Storage object. Soft-delete via deleted_at.';

COMMENT ON COLUMN public.stored_asset.object_path IS
  'Object key inside the bucket (no leading bucket name).';

COMMENT ON COLUMN public.stored_asset.visibility IS
  'private = owner/staff; institute = active members; staff = staff only.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.stored_asset ENABLE ROW LEVEL SECURITY;

CREATE POLICY stored_asset_select_scoped
  ON public.stored_asset FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        visibility = 'private'
        AND owner_user_id = auth.uid()
        AND public.is_institute_member(institute_id)
      )
      OR (
        visibility = 'institute'
        AND public.is_institute_member(institute_id)
      )
      OR (
        visibility = 'staff'
        AND public.is_staff_of_institute(institute_id)
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.stored_asset FROM anon, authenticated;
GRANT SELECT ON TABLE public.stored_asset TO authenticated;
GRANT ALL ON TABLE public.stored_asset TO service_role;
