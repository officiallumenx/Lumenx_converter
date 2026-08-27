-- =============================================================================
-- LumenX Migration 040 — Support internal-note RLS tightening
-- Version: 20260827361000
--
-- Restrict support_message internal rows to support write roles only.
-- Billing/analyst remain able to SELECT public (non-internal) messages.
-- =============================================================================

DROP POLICY IF EXISTS support_message_select_scoped ON public.support_message;

CREATE POLICY support_message_select_scoped
  ON public.support_message FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      (
        is_internal = true
        AND public.has_platform_role(
          VARIADIC ARRAY['nexus_root', 'operations', 'support']::text[]
        )
      )
      OR (
        is_internal = false
        AND (
          public.is_platform_operator()
          OR public.is_staff_of_institute(institute_id)
        )
      )
    )
  );
