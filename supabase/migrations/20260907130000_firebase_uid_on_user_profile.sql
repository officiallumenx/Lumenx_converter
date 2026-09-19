-- =============================================================================
-- LumenX Migration — Firebase Auth UID on existing user_profile
-- Version: 20260907130000
--
-- Phase 2: map Firebase Auth users onto existing LumenX identities.
-- Does NOT replace auth.users / user_profile.id (still Supabase Auth UUID).
-- Does NOT create people rows. Preserves membership / roles / RBAC FKs.
-- =============================================================================

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS firebase_uid text NULL,
  ADD COLUMN IF NOT EXISTS firebase_linked_at timestamptz NULL;

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_firebase_uid_len_check;
ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_firebase_uid_len_check CHECK (
    firebase_uid IS NULL OR char_length(trim(firebase_uid)) BETWEEN 1 AND 128
  );

-- One Firebase UID → one active profile (soft-deleted rows excluded).
CREATE UNIQUE INDEX IF NOT EXISTS user_profile_firebase_uid_uidx
  ON public.user_profile (firebase_uid)
  WHERE firebase_uid IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.user_profile.firebase_uid IS
  'Firebase Auth UID linked to this LumenX person. Opaque string; never used as PK.';
COMMENT ON COLUMN public.user_profile.firebase_linked_at IS
  'When firebase_uid was first set on this profile.';

COMMENT ON TABLE public.user_profile IS
  'Person record linked to auth.users. Passwords/sessions in Auth; username/PIN/Firebase UID factors stored here.';
