-- =============================================================================
-- teacher.photo_asset_path — canonical staff/teacher profile photo
-- Same semantics as student.photo_asset_path: private Storage object key.
-- =============================================================================

ALTER TABLE public.teacher
  ADD COLUMN IF NOT EXISTS photo_asset_path text NULL;

COMMENT ON COLUMN public.teacher.photo_asset_path IS
  'Private Supabase Storage object key for profile photo (student-media bucket). Not a public URL. Same convention as student.photo_asset_path.';
