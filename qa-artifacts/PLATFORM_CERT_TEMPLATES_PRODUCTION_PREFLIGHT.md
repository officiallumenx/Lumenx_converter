# Platform certificate templates — production preflight (2026-10-11)

**Target migration:** `supabase/migrations/20261011140000_platform_certificate_templates_pptx.sql`  
**Linked project:** `kmpzflsurepjwqnfqyld` (name: LumenX, region: ap-south-1, status: ACTIVE_HEALTHY)  
**dotenv project_ref:** `kmpzflsurepjwqnfqyld` (matches linked ref)  
**Decision:** **STOP — migration not applied**

## Stage 1 — Target verification

| Check | Result |
|-------|--------|
| CLI linked project | `kmpzflsurepjwqnfqyld` |
| `show:supabase-target` | same ref; hosted_cloud=yes |
| Migration file present | yes (additive PPTX columns + private bucket upsert) |
| Feature flag default | `VITE_NEXUS_TEMPLATE_DB_CATALOG` OFF (`isDbCertificateCatalogEnabled` false unless true/1/on/yes) |
| Documents decoupling | `TEMPLATE_COLS` excludes PPTX catalog columns; `TEMPLATE_PPTX_CATALOG_COLS` denylist preserved |
| Unrelated pending migration | `20261009180000_transport_trip_vehicle_date_slot_unique.sql` also local-only |

## Stage 2 — Read-only preflight (evidence)

Command: `npx supabase db query --linked -f qa-artifacts/preflight-platform-cert-templates-ro.sql`

| Check | Result |
|-------|--------|
| `20261011140000` in `schema_migrations` | **0 (not applied)** |
| `20261009180000` in `schema_migrations` | **0 (not applied)** |
| PPTX columns (`family_id`, `asset_path`, …) | **missing** |
| Existing `layout_mode` values | `blocks` only (1 row); incompatible count **0** |
| Existing check | `template_layout_mode_check` = `('blocks','visual')` — safe to replace with +`pptx` |
| Target indexes | not present |
| Template rows | total=1, live=1, live_platform_certs=0 — `family_id = id` backfill safe |
| Bucket `certificate-templates` | **missing** |
| Storage policies for that bucket | **0** (service_role-only write path as designed) |
| `db push --dry-run` | would apply **both** transport + platform-cert migrations |

### Backup / recovery

Command: `npx supabase backups list --project-ref kmpzflsurepjwqnfqyld`

```json
{"region":"ap-south-1","walg_enabled":true,"pitr_enabled":false,"backups":[]}
```

| Check | Result |
|-------|--------|
| PITR | **disabled** |
| Listed physical backups | **none** |
| Recovery point suitability | **inadequate for mutation gate** |

## Stage 3 — Gate

**STOP before mutation** because backup/recovery position is inadequate (`pitr_enabled=false` and empty `backups` list).

Additional caution (not the sole stopper): plain `supabase db push` would also apply unrelated transport migration `20261009180000`.

### Exact mutation command (NOT executed — for when gate clears)

1. Confirm PITR or a usable physical backup exists in the Supabase dashboard for `kmpzflsurepjwqnfqyld`.
2. Isolate unrelated pending migration (temporary move out of `supabase/migrations/`), then:

```bash
# From repo root — shell-only ack; do not commit these env vars
$env:ALLOW_REMOTE_DB_WRITES="I_CONFIRM_REMOTE_DATABASE_WRITES"
$env:REMOTE_WRITE_PROJECT_REF="kmpzflsurepjwqnfqyld"
$env:CONFIRM_MIGRATION_TARGET="kmpzflsurepjwqnfqyld"
npm run preflight:migration --workspace=@lumenx/api -- 20261011140000_platform_certificate_templates_pptx.sql
npx supabase db push --linked --dry-run   # must list ONLY the platform-cert migration
npx supabase db push --linked --yes
```

3. Restore the temporarily moved transport migration file to `supabase/migrations/`.
4. Re-run post-apply verification SQL; keep `VITE_NEXUS_TEMPLATE_DB_CATALOG` OFF.

## Stages 4–7

| Stage | Status |
|-------|--------|
| 4 Apply migration | **Not executed** |
| 5 Schema/Storage verify | N/A (blocked) |
| 6 Deploy / enable flag | **Not executed**; flag remains OFF |
| 7 Production smoke | **Not run** (no approved test institution/template exercise; mutation blocked) |

## Recovery posture if applied later

- No down migration — do not improvise DROP.
- Keep feature flag OFF; soft-archive platform template rows if needed.
- Do not delete Storage bucket/objects or issued-certificate history as rollback.
