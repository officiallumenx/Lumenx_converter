# Platform certificate templates — migration & rollout notes

**Migration file:** `supabase/migrations/20261011140000_platform_certificate_templates_pptx.sql`  
**Status:** **Applied to hosted production** `kmpzflsurepjwqnfqyld` on 2026-10-11 (`supabase db push --linked`, verified in `schema_migrations` + post-apply SQL).

**Sibling transport migration** `20261009180000` was **applied** after soft-deleting 3 evidenced redundant trips (see `qa-artifacts/TRANSPORT_DUP_RESOLUTION.md`).

**Production preflight artifact:** `qa-artifacts/PLATFORM_CERT_TEMPLATES_PRODUCTION_PREFLIGHT.md`

## Safety rules

- Linked hosted project ref: `kmpzflsurepjwqnfqyld` (confirm with `npm run show:supabase-target --workspace=@lumenx/api` before any mutation).
- Do **not** run a broad `supabase db push` while unrelated pending migrations exist (currently also `20261009180000_transport_trip_vehicle_date_slot_unique.sql`).
- Do **not** apply while PITR is off and no physical backups are listed (`supabase backups list` returned `pitr_enabled=false`, `backups=[]` on 2026-10-11) — enable PITR / confirm a recovery point first.
- Feature flag `VITE_NEXUS_TEMPLATE_DB_CATALOG` defaults **OFF**. Do not enable against production until schema, Storage, auth, and smoke gates pass.

## What the migration adds

1. `template.layout_mode` allows `pptx`
2. Columns: `family_id`, `asset_path`, `file_name`, `file_byte_size`, `file_content_type`, `pptx_meta`
3. Backfill `family_id = id` for existing rows
4. Private Storage bucket `certificate-templates` (5 MB, PPT/PPTX mimes)

Platform PPTX files are stored under `platform/{templateId}/v{version}/{fileName}` and referenced by `template.asset_path`. They are **not** registered in `stored_asset` (that table requires `institute_id`).

## Local apply (only when Docker + local Supabase are healthy)

```bash
# From repo root — confirm status shows local URLs, NOT the hosted project ref
npx supabase status

# Apply migrations to the LOCAL database only
npx supabase migration up
# or: npx supabase db reset   # wipes LOCAL data only
```

Point `backend/.env.local` (or a dedicated local env) at `http://127.0.0.1:54321` with local keys from `supabase status`. Never paste secrets into git or chat.

## Opt-in import (safe)

`POST /api/nexus/certificate-templates/import` accepts an explicit JSON body (optional base64 file). It does **not** scrape browser localStorage or production. localStorage is never auto-deleted.

## Rollback

1. Keep `VITE_NEXUS_TEMPLATE_DB_CATALOG` off (UI uses localStorage).
2. Soft-delete / archive platform template rows if needed; do not hard-delete Storage objects without approval.
3. Reverting the migration itself requires a new down-migration and explicit approval (no automatic drop in this file).

## Compatibility

- Issued certificates, numbering, Connect verify unchanged.
- Transfer Certificates remain Documents → Official docs.
- Document Requests remain deferred.
- Documents domain select/insert stays on pre-PPTX `template` columns (Phase 8 decoupling).
- Hybrid Admin ledger sync (`api-sync`) may create metadata-only issued rows (`asset_path` null) — interim until Storage-backed PPTX cutover.
- Nexus dual-write mirror runs only when `VITE_NEXUS_TEMPLATE_DB_CATALOG` is explicitly enabled; flag defaults OFF and localStorage remains UI SoT on API failure.

## Pillar code status (repo)

Application code for Documents/Certificates/PPTX catalog APIs is present with unit/safe-e2e coverage. **Board-faithful TC PDF**, **hosted migration apply**, and **live RLS/Storage verification** remain blocked pending sample/approvals — see Phase 12 notes in `render-pdf.ts` header.
