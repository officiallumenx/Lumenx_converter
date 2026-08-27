-- =============================================================================
-- LumenX Migration 028 — Documents / templates foundation
-- Version: 20260827270000
--
-- Tables (exactly 2 — step 5.1 / blueprint Documents slice):
--   template              (polymorphic; owner_scope ∈ {platform, institute})
--   generated_document    (incl. id_card; issued instances + workflow)
--
-- Out of scope (defer):
--   issued_certificate registry table, Storage buckets / PDF render,
--   batch jobs, Nexus platform template CRUD, signature capture,
--   notification fan-out, version-group history table
--
-- Model:
--   platform|institute template → generate → workflow → published portal read
--
-- Hono = authoritative writes via service_role; RLS = defense-in-depth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. template (polymorphic document / certificate / report / id_card)
-- -----------------------------------------------------------------------------
CREATE TABLE public.template (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_scope             text NOT NULL,
  institute_id            uuid NULL REFERENCES public.institute (id),

  type                    text NOT NULL,
  name                    text NOT NULL,
  description             text NULL,
  category                text NULL,

  status                  text NOT NULL DEFAULT 'draft',
  source                  text NOT NULL DEFAULT 'custom',
  version                 integer NOT NULL DEFAULT 1,

  preview_aspect          text NOT NULL DEFAULT 'a4',
  layout_mode             text NOT NULL DEFAULT 'blocks',
  blocks                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  visual_theme            text NULL,
  visual_fields           jsonb NULL,
  tags                    jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_by_user_id      uuid NULL REFERENCES public.user_profile (id),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT template_name_check CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT template_owner_scope_check CHECK (
    owner_scope IN ('platform', 'institute')
  ),
  CONSTRAINT template_owner_institute_check CHECK (
    (owner_scope = 'platform' AND institute_id IS NULL)
    OR (owner_scope = 'institute' AND institute_id IS NOT NULL)
  ),
  CONSTRAINT template_type_check CHECK (
    type IN ('certificate', 'report', 'id_card', 'document')
  ),
  CONSTRAINT template_status_check CHECK (
    status IN ('draft', 'active', 'archived')
  ),
  CONSTRAINT template_source_check CHECK (
    source IN ('system', 'custom', 'imported')
  ),
  CONSTRAINT template_version_check CHECK (version >= 1),
  CONSTRAINT template_preview_aspect_check CHECK (
    preview_aspect IN ('a4', 'id_card', 'letter')
  ),
  CONSTRAINT template_layout_mode_check CHECK (
    layout_mode IN ('blocks', 'visual')
  ),
  CONSTRAINT template_blocks_is_array CHECK (jsonb_typeof(blocks) = 'array'),
  CONSTRAINT template_tags_is_array CHECK (jsonb_typeof(tags) = 'array'),

  CONSTRAINT template_id_key UNIQUE (id)
);

CREATE INDEX template_institute_id_idx
  ON public.template (institute_id)
  WHERE deleted_at IS NULL AND institute_id IS NOT NULL;

CREATE INDEX template_owner_scope_status_idx
  ON public.template (owner_scope, status)
  WHERE deleted_at IS NULL;

CREATE INDEX template_type_idx
  ON public.template (type)
  WHERE deleted_at IS NULL;

CREATE TRIGGER template_set_updated_at
  BEFORE UPDATE ON public.template
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.template IS
  'Polymorphic document/certificate/report/id_card template. owner_scope=platform|institute.';

COMMENT ON COLUMN public.template.type IS
  'certificate | report | id_card | document — merges former document_template + certificate_template.';

-- -----------------------------------------------------------------------------
-- 2. generated_document (issued instances; id_card collapsed here)
-- -----------------------------------------------------------------------------
CREATE TABLE public.generated_document (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id            uuid NOT NULL REFERENCES public.institute (id),
  template_id             uuid NOT NULL REFERENCES public.template (id),

  type                    text NOT NULL,
  title                   text NOT NULL,

  student_id              uuid NULL,
  teacher_id              uuid NULL,
  recipient_name          text NOT NULL,
  recipient_ref           text NULL,

  status                  text NOT NULL DEFAULT 'ready',
  workflow_state          text NOT NULL DEFAULT 'draft',
  certificate_number      text NULL,

  portal_student          boolean NOT NULL DEFAULT false,
  portal_parent           boolean NOT NULL DEFAULT false,
  portal_teacher          boolean NOT NULL DEFAULT false,

  rejection_reason        text NULL,
  payload                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  asset_path              text NULL,

  generated_by_user_id    uuid NOT NULL REFERENCES public.user_profile (id),
  published_at            timestamptz NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz NULL,

  CONSTRAINT generated_document_title_check CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT generated_document_recipient_check CHECK (char_length(trim(recipient_name)) >= 1),
  CONSTRAINT generated_document_type_check CHECK (
    type IN ('certificate', 'report', 'id_card', 'document')
  ),
  CONSTRAINT generated_document_status_check CHECK (
    status IN ('ready', 'archived')
  ),
  CONSTRAINT generated_document_workflow_check CHECK (
    workflow_state IN (
      'draft',
      'teacher_review',
      'admin_review',
      'published',
      'rejected'
    )
  ),
  CONSTRAINT generated_document_payload_is_object CHECK (
    jsonb_typeof(payload) = 'object'
  ),

  CONSTRAINT generated_document_id_institute_key UNIQUE (id, institute_id),

  CONSTRAINT generated_document_student_institute_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.student (id, institute_id),

  CONSTRAINT generated_document_teacher_institute_fkey
    FOREIGN KEY (teacher_id, institute_id)
    REFERENCES public.teacher (id, institute_id)
);

CREATE INDEX generated_document_institute_id_idx
  ON public.generated_document (institute_id)
  WHERE deleted_at IS NULL;

CREATE INDEX generated_document_template_id_idx
  ON public.generated_document (template_id)
  WHERE deleted_at IS NULL;

CREATE INDEX generated_document_workflow_idx
  ON public.generated_document (institute_id, workflow_state)
  WHERE deleted_at IS NULL;

CREATE INDEX generated_document_student_id_idx
  ON public.generated_document (student_id)
  WHERE deleted_at IS NULL AND student_id IS NOT NULL;

CREATE TRIGGER generated_document_set_updated_at
  BEFORE UPDATE ON public.generated_document
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.generated_document IS
  'Rendered/issued document instance (certificates, reports, id cards, documents). Soft-delete via deleted_at.';

COMMENT ON COLUMN public.generated_document.workflow_state IS
  'draft|teacher_review|admin_review|published|rejected — Admin publishing workflow.';

COMMENT ON COLUMN public.generated_document.asset_path IS
  'Private Storage object key when PDF/image exists; no binary in DB.';

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_document ENABLE ROW LEVEL SECURITY;

-- Templates: writers see institute drafts; members/staff see active institute + active platform catalog.
CREATE POLICY template_select_scoped
  ON public.template FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR (
        owner_scope = 'platform'
        AND status = 'active'
      )
      OR (
        owner_scope = 'institute'
        AND institute_id IS NOT NULL
        AND (
          (
            status IN ('draft', 'archived')
            AND public.has_institute_role(
              institute_id,
              'institute_admin',
              'principal',
              'vice_principal',
              'coordinator',
              'it_admin'
            )
          )
          OR (
            status = 'active'
            AND (
              public.is_staff_of_institute(institute_id)
              OR public.is_institute_member(institute_id)
            )
          )
        )
      )
    )
  );

-- Generated: staff read institute-wide; learners only published + portal flag + linked subject
CREATE POLICY generated_document_select_scoped
  ON public.generated_document FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_operator()
      OR public.is_staff_of_institute(institute_id)
      OR (
        workflow_state = 'published'
        AND status = 'ready'
        AND (
          (
            portal_student = true
            AND student_id IS NOT NULL
            AND public.is_own_student_row(student_id)
          )
          OR (
            portal_parent = true
            AND student_id IS NOT NULL
            AND public.is_guardian_of_student(student_id)
          )
          OR (
            portal_teacher = true
            AND public.has_institute_role(institute_id, 'teacher')
          )
        )
      )
    )
  );

-- =============================================================================
-- Privileges
-- =============================================================================
REVOKE ALL ON TABLE public.template FROM anon, authenticated;
REVOKE ALL ON TABLE public.generated_document FROM anon, authenticated;

GRANT SELECT ON TABLE public.template TO authenticated;
GRANT SELECT ON TABLE public.generated_document TO authenticated;

GRANT ALL ON TABLE public.template TO service_role;
GRANT ALL ON TABLE public.generated_document TO service_role;
