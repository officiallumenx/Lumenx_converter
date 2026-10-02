-- Driver profile photos (same convention as teacher/student photo_asset_path).

ALTER TABLE public.driver
  ADD COLUMN IF NOT EXISTS photo_asset_path text NULL;

COMMENT ON COLUMN public.driver.photo_asset_path IS
  'Private Supabase Storage object key for driver profile photo (student-media bucket). Not a public URL.';

-- Allow stored_asset to link to drivers
ALTER TABLE public.stored_asset
  DROP CONSTRAINT IF EXISTS stored_asset_linked_kind_check;

ALTER TABLE public.stored_asset
  ADD CONSTRAINT stored_asset_linked_kind_check CHECK (
    linked_entity_kind IS NULL
    OR linked_entity_kind IN (
      'student',
      'teacher',
      'driver',
      'parent',
      'admission_document',
      'career_application',
      'issued_certificate',
      'generated_document',
      'event',
      'other'
    )
  );
