# ADR: Nexus platform certificate templates as database source of truth

**Status:** Implemented in repository (code + additive migration file) — **not applied to hosted production**  
**Date:** 2026-10-11 (updated same day for implementation)  
**Scope:** Nexus PPTX certificate template catalog DB source of truth  
**Out of scope:** Hosted production migration apply, automatic localStorage wipe, Document Requests, TC ledger changes

---

## 1. Context

Phase A verified that:

- Admin DocHub keeps Transfer Certificates as **Documents → Official docs** (`type: document`). They must not enter `issued_certificate` through the normal issue API.
- Award certificates use `template` + `generated_document` + `issued_certificate`, with private Storage and public Connect verify.
- Nexus PPTX catalog today lives in browser **`localStorage`** (`lumenx.nexus.certificate-templates.v1` via `@lumenx/module-certificates`). Admin consumes published entries from the same client store.
- Platform DB already has polymorphic `public.template` (`owner_scope ∈ {platform, institute}`) and Hono `/api/v1/documents/templates`, but that model is blocks/visual — **not** Nexus PPTX file + field-mapping SoT.

Product decision: Nexus template management must eventually use **real platform/database templates** as the source of truth.

---

## 2. Decision

Adopt a **platform-owned DB + private PPTX Storage** source of truth for Nexus certificate templates, with:

1. Metadata in Postgres (extend or satellite the existing `template` model).
2. PPTX bytes in a **private** Supabase Storage bucket, accessed only via Hono `service_role` upload + signed URL mint (same pattern as `certificates` / `generated-documents`).
3. Nexus platform operators as the only writers of platform catalog rows.
4. Admin (and issue flows) consuming **published-only** platform templates via API — never drafts/archived, never localStorage as SoT once dual-read is retired.
5. Existing browser localStorage **preserved** during rollout (no silent wipe).
6. **Dual-read + feature flag** until staging and production cutover are approved.
7. Transfer Certificates remain Documents; Document Requests stay deferred.

This ADR locks the design. Implementation requires a later explicit Phase B approval.

---

## 3. Metadata schema (proposed — additive, approval-gated)

Reuse `public.template` where possible:

| Concern | Proposal |
|---|---|
| Identity | `template.id` (uuid), stable across publishes where possible; version via `version` and optional `family_id` (new column or jsonb) |
| Ownership | `owner_scope = 'platform'`, `institute_id IS NULL` for Nexus catalog |
| Kind | `type = 'certificate'` |
| Lifecycle | Map Nexus `draft \| published \| archived` ↔ DB `draft \| active \| archived` (`published` → `active`) |
| Layout | Prefer `layout_mode` extension or `source = 'imported'` + jsonb for PPTX targets/mappings (e.g. `visual_fields` / new `pptx_meta jsonb`) |
| File pointer | `asset_path` (or linked `stored_asset`) — object path in private bucket; mime `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| Audit | `created_by_user_id`, timestamps, soft `deleted_at` |

**Do not** store PPTX `dataUrl` in Postgres.  
**Do not** change `issued_certificate` numbering or TC document types as part of this work.

Exact DDL is **approval-required** and must ship as a new migration only after staging confirmation.

---

## 4. Private PPTX storage

| Item | Design |
|---|---|
| Bucket | New private bucket (e.g. `certificate-templates`) **or** approved extension of an existing private bucket’s `allowed_mime_types` |
| Public access | None — no anon/authenticated Storage policies for direct read |
| Path convention | `platform/{template_id}/{version}/{safeFileName}.pptx` |
| Upload / download | Hono only (service_role); Admin/Nexus receive short-lived signed URLs after authz |
| Virus scan / quota | Out of scope for first cut (match documents foundation notes) |

Creating or altering buckets/policies is **approval-required**.

---

## 5. Authorization

| Actor | Capabilities |
|---|---|
| Nexus platform operator | Create/update/publish/archive platform certificate templates; upload PPTX; list all statuses for platform catalog |
| Institute Admin / writers | List/get **published (active) platform** certificate templates only; issue certificates using published ids; no platform draft mutation |
| Teachers / parents / anon | No catalog write; parents see issued ledger per existing rules; anon only public verify of issued numbers |

Institute-scoped custom templates may remain a later phase; first cut is **platform catalog only**.

---

## 6. Admin published-only consumption

Replace client `listPublishedCertificateTemplates()` localStorage reads with API:

- `GET` platform templates filtered to `owner_scope=platform`, `type=certificate`, `status=active` (published).
- At most one active version per family (highest `version` wins), matching today’s Admin helper semantics.
- Issue/revoke paths stay on `/api/v1/certificates`; they already require `template.type === 'certificate'`.

Nexus UI remains the authoring surface; Admin remains the consumption/issue surface.

---

## 7. localStorage preservation and dual-read / feature flag

| Phase | Behavior |
|---|---|
| Flag off (default) | Unchanged: Nexus/Admin use `@lumenx/module-certificates` localStorage |
| Dual-read on (staging first) | Read DB published catalog first; fall back to localStorage if empty/error; writes still local unless write-flag on |
| Dual-write (optional staging) | Nexus publish writes DB+Storage and mirrors metadata locally |
| Cutover | Flag forces DB SoT; localStorage retained as read-only cache/export until operators confirm |
| Rollback | Disable flag → prior localStorage behavior; DB rows and Storage objects retained (no destructive delete) |

Suggested flag name (env, non-production first): `VITE_NEXUS_TEMPLATE_DB_CATALOG` / API `NEXUS_TEMPLATE_DB_CATALOG` — exact names chosen at implementation time. **Do not** set production flags without approval.

---

## 8. Migration / backfill approach

1. Land additive migration + bucket on **staging** only after owner confirmation.
2. Provide an **opt-in** Nexus export tool (browser): dump local catalog JSON + PPTX blobs for operator review — no auto-upload in Phase B0.
3. Staging backfill: operator-approved upload script or Nexus “Import to platform” action writing DB + Storage.
4. Validate Admin dual-read against staging published set.
5. Production: repeat with explicit approval; never auto-wipe localStorage; never reset certificate numbers.

Document Requests remain deferred. TC stays in Documents Official docs.

---

## 9. Rollback strategy

- Feature flag off restores localStorage SoT for UI.
- Keep DB/Storage artifacts for forensics; soft-delete only if a separate cleanup is approved.
- Issued certificates already pointing at template ids must keep resolving (stable ids or family mapping table).
- No certificate number format changes; no TC → ledger backfill.

---

## 10. Compatibility requirements

- Existing `issued_certificate` rows and `CERT/{year}/{NNNN}` format unchanged.
- TC / `type: document` continue to be rejected by issue API (covered by Phase B0 unit tests).
- Connect `/verify-certificate` payload unchanged in this design.
- Demo DocHub “Requests” remains non-API.

---

## 11. Local verification prerequisites (no separate hosted staging)

Project constraint: **do not** create a separate hosted Supabase staging project. Hosted cloud = production. Verify with mocks and optional **local** Supabase only.

### Prerequisites before applying the migration anywhere

- [ ] Docker Desktop running and `npx supabase status` shows a **local** API URL (`127.0.0.1` / `localhost`), not the hosted production project ref.
- [ ] Local env file (e.g. `backend/.env.local`) points API at local Supabase keys from `supabase status` — never reuse production service-role against local accidentally for prod writes.
- [ ] Confirm `npm run show:supabase-target` against the env you will mutate does **not** report the production hosted ref.
- [ ] `VITE_NEXUS_TEMPLATE_DB_CATALOG` remains unset/false until local migration is applied and dual-read is intentionally tested.
- [ ] Written approval before applying the same migration to hosted production.

See also: `docs/backend/PLATFORM_CERTIFICATE_TEMPLATES_MIGRATION.md` and `backend/STAGING.md` (hosted staging remains optional/unused).

### Local verification checklist

- [ ] `npx supabase migration up` (or `db reset`) on **local** only.
- [ ] Confirm bucket `certificate-templates` exists locally and is private.
- [ ] Nexus create → upload → publish → Admin `GET /platform-templates` on local API.
- [ ] Unit/mocked tests remain green without any hosted connection.
- [ ] Enable `VITE_NEXUS_TEMPLATE_DB_CATALOG=true` only against local API for dual-read smoke.

### Explicitly forbidden until later approval

- Production migration apply, seeds, resets, backfills
- Nexus localStorage → DB sync in production
- Storage policy loosening or public buckets
- Certificate numbering resets
- Document Requests implementation
- Moving TC into the certificate ledger
- Treating hosted dotenv target as a safe write environment

---

## 12. Approval-required items for production rollout

1. Apply additive migration `20261011140000_platform_certificate_templates_pptx.sql` to hosted production  
2. Confirm private bucket `certificate-templates` on production  
3. Opt-in production import/upload of PPTX templates  
4. Enable `VITE_NEXUS_TEMPLATE_DB_CATALOG` for Admin/Nexus production builds  
5. Any RLS/GRANT/Storage policy change beyond this migration  
6. Any change to public verify response or numbering format (not expected)

---

## 13. Recommended next approval

**Approve local Supabase apply** (Docker + `supabase start` + local migration up) for integration/RLS verification — still no production writes.

Then separately: **Approve production migration apply** when ready.
