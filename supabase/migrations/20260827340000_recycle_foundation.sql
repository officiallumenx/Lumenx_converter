-- =============================================================================
-- LumenX Migration 036 — Recycle bin foundation
-- Version: 20260827340000
--
-- Tables (exactly 1 — step governance / blueprint V1.5):
--   recycle_item
--
-- Out of scope (defer):
--   Cross-domain soft_delete/restore RPC automation for every table,
--   scheduled 90-day purge job, notification recycle bin (separate LS),
--   hard DELETE of source rows on purge, Storage object purge
--
-- Model:
--   Domain soft-delete → insert recycle_item (status=in_bin)
--   Restore → clear source deleted_at when known + status=restored
--   Purge → status=purged (bin entry only; source stays soft-deleted)
--   Retention hint: 90 days (enforced in API list + future job)
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

CREATE TABLE public.recycle_item (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),

  entity_kind             text NOT NULL,
  entity_id               uuid NOT NULL,
  module                  text NOT NULL,
  title                   text NOT NULL,
  subtitle                text NULL,
  snapshot                jsonb NULL,

  status                  text NOT NULL DEFAULT 'in_bin',

  deleted_by_user_id      uuid NOT NULL REFERENCES public.user_profile (id),
  deleted_at              timestamptz NOT NULL DEFAULT now(),

  restored_by_user_id     uuid NULL REFERENCES public.user_profile (id),
  restored_at             timestamptz NULL,

  purged_by_user_id       uuid NULL REFERENCES public.user_profile (id),
  purged_at               timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recycle_item_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT recycle_item_module_check CHECK (
    module IN (
      'Students',
      'Teachers',
      'Parents',
      'Accounts',
      'Subjects',
      'Documents',
      'Events',
      'Templates',
      'Homework',
      'Assets',
      'Other'
    )
  ),
  CONSTRAINT recycle_item_entity_kind_check CHECK (
    entity_kind IN (
      'student',
      'teacher',
      'parent',
      'staff_account',
      'subject',
      'event',
      'homework',
      'template',
      'generated_document',
      'stored_asset',
      'other'
    )
  ),
  CONSTRAINT recycle_item_status_check CHECK (
    status IN ('in_bin', 'restored', 'purged')
  ),
  CONSTRAINT recycle_item_restored_pair_check CHECK (
    (status = 'restored' AND restored_at IS NOT NULL AND restored_by_user_id IS NOT NULL)
    OR (status <> 'restored' AND restored_at IS NULL AND restored_by_user_id IS NULL)
  ),
  CONSTRAINT recycle_item_purged_pair_check CHECK (
    (status = 'purged' AND purged_at IS NOT NULL AND purged_by_user_id IS NOT NULL)
    OR (status <> 'purged' AND purged_at IS NULL AND purged_by_user_id IS NULL)
  ),

  CONSTRAINT recycle_item_id_institute_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX recycle_item_active_entity_uidx
  ON public.recycle_item (institute_id, entity_kind, entity_id)
  WHERE status = 'in_bin';

CREATE INDEX recycle_item_institute_status_idx
  ON public.recycle_item (institute_id, status, deleted_at DESC);

CREATE INDEX recycle_item_deleted_at_idx
  ON public.recycle_item (deleted_at)
  WHERE status = 'in_bin';

CREATE TRIGGER recycle_item_set_updated_at
  BEFORE UPDATE ON public.recycle_item
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.recycle_item IS
  'Institute recycle bin registry for soft-deleted entities (90-day retention).';

COMMENT ON COLUMN public.recycle_item.snapshot IS
  'Optional JSON snapshot for restore UX; authoritative restore clears source deleted_at when supported.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.recycle_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY recycle_item_select_scoped
  ON public.recycle_item FOR SELECT TO authenticated
  USING (
    (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
    )
    AND (
      status <> 'in_bin'
      OR deleted_at >= (now() - interval '90 days')
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.recycle_item FROM anon, authenticated;
GRANT SELECT ON TABLE public.recycle_item TO authenticated;
GRANT ALL ON TABLE public.recycle_item TO service_role;
