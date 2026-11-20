# Transport Location Migration — Production Backup & Recovery Readiness

**Date:** 2026-11-01 (backup continuation — WSL/Docker gate re-check ~20:50 IST)  
**Mode:** Backup preparation & verification only  
**Candidate migration:** `supabase/migrations/20261101140000_transport_location_snapshot.sql`  
**Staging:** migration applied & verified on `lumenx-staging` / `yveadybpntziyryxsrsu`

---

## Final decision

# BACKUP NOT READY

## GO / NO-GO recommendation

# **NO-GO** for production Transport Location migration

Usable recovery has **not** been proven. Logical dump was **not** attempted because Docker Server did not respond (WSL still missing).

| Requirement | Status |
|-------------|--------|
| Production identity confirmed | **PASS** |
| Listable physical backups with timestamp | **FAIL** (`backups: null`) |
| PITR enabled with recoverable points | **FAIL** (`pitr_enabled: false`) |
| Verified logical dump (non-empty + SHA-256 + inspectable) | **FAIL** (Docker Server not responding; **WSL not installed**) |
| Isolated restore test | **NOT PERFORMED** |
| Five legacy asymmetries preserved & documented | **PASS** (read-only worksheet) |
| Migration / deploy | **NOT RUN** (correct) |

Do **not** apply the production migration until this decision flips to **BACKUP READY**.

---

## 1. Confirmed production project identity

| Field | Value |
|-------|--------|
| Name | **LumenX** |
| Ref | **`kmpzflsurepjwqnfqyld`** |
| Region | `ap-south-1` |
| Status | `ACTIVE_HEALTHY` |
| Org | LumenX (`szhfrskgfxbwygiizegr`) |
| Created | 2026-08-14 |
| Approx DB size (read-only) | **34 MB** |
| CLI link | **Not linked** (default link is staging — all prod commands used `--project-ref kmpzflsurepjwqnfqyld`) |
| Denylist | Present in `PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST` |

**Staging (do not confuse):** `lumenx-staging` / `yveadybpntziyryxsrsu` (CLI linked).

No production schema/data mutations, RLS changes, or deploys were performed in this pass.

---

## 2. Plan and backup capabilities

| Item | Evidence | Assessment |
|------|----------|------------|
| Supabase plan (exact SKU) | **Not exposed** by `supabase projects list` / backups API | **Unknown from CLI** — confirm in Dashboard → Organization → Billing |
| Daily automatic backups | Pro/Team/Enterprise per Supabase docs; Free = no platform daily backups | **Unproven** — CLI returns no backup entries |
| PITR support | Pro+ as **paid add-on**; needs ≥ Small compute | **Supported only after plan/add-on** |
| PITR currently enabled | `pitr_enabled: false` | **Disabled** |
| WAL-G flag | `walg_enabled: true` | Insufficient alone — no listable restore points |
| Logical dump via CLI | Supported (`db dump`); needs Docker for this CLI path | Capability present; **execution blocked** |

### PITR — STOP for user authorization (billing/config)

To enable PITR on production you must explicitly authorize (this agent will **not** change billing):

1. Confirm project is on **Pro, Team, or Enterprise**.  
2. Ensure compute is at least **Small**.  
3. In Dashboard → **Database → Backups → Point in Time**, enable PITR and choose retention (**7 / 14 / 28** days).  
4. Accept add-on cost (indicative: ~**$100 / $200 / $400** per month for 7 / 14 / 28 days — verify live pricing).  
5. Wait until Dashboard shows **earliest/latest recovery points**, then re-run `supabase backups list --project-ref kmpzflsurepjwqnfqyld`.  
6. Enabling PITR alone is **not** BACKUP READY — recoverable points must be visible.

**Do not enable PITR without explicit owner approval.**

---

## 3. PITR status

| Check | Result |
|-------|--------|
| Enabled | **No** |
| Recoverable points visible via CLI | **No** |
| Usable for migration rollback | **No** |

---

## 4. Physical backup availability

Command:

```bash
npx supabase backups list --project-ref kmpzflsurepjwqnfqyld -o json
```

Result:

```json
{
  "backups": null,
  "physical_backup_data": {},
  "pitr_enabled": false,
  "region": "ap-south-1",
  "walg_enabled": true
}
```

| Check | Result |
|-------|--------|
| Listable physical backups | **None** |
| Latest backup timestamp | **Unknown** |
| Retention period | **Unknown via CLI** — if Pro daily backups exist, docs say **7 days** (Team 14 / Enterprise up to 30); **confirm in Dashboard** |
| Restoration possible from CLI inventory | **Not evidenced** |

Dashboard cross-check still required: **Project Settings / Database → Backups**.

---

## 5–8. Logical backup status, path, checksum, integrity, restore test

### Docker / WSL gate (re-checked ~20:50 IST — timed probes only)

| Check | Result |
|-------|--------|
| `wsl --status` (8s cap) | **FAIL** — *“The Windows Subsystem for Linux is not installed…”* |
| `docker version` (12s cap) | **TIMEOUT** — Server never returned |
| `docker info` (12s cap) | **TIMEOUT** — Server never returned |
| Docker Server responding | **No** |
| Root cause | **WSL not installed** (unchanged: 20:42 / 20:46 / 20:50) |
| Logical dump | **Not attempted** |
| SHA-256 / integrity / restore | **N/A** |

#### Blocker — install WSL (requires operator / admin)

Docker Desktop’s Linux engine cannot become healthy until WSL is installed. This agent did **not** run `wsl --install` (OS change + likely reboot; needs explicit owner approval).

1. Elevated PowerShell: `wsl --install` (or enable WSL + a distro via Optional Features / Store).  
2. **Reboot** if prompted.  
3. Start Docker Desktop; wait until engine healthy.  
4. Confirm: `docker version` and `docker info` both show Server (no hang/timeout).  
5. Re-run this backup preparation for the logical dump.

Until then, `supabase db dump` cannot proceed on this machine.

### Prepared secure directory (outside Git)

```
C:\Users\Lokesh vella\Desktop\lumenx-secure-backups\production\kmpzflsurepjwqnfqyld\
```

- Contains `README.txt` with dump commands.  
- **No dump file yet** (blocked on Docker).  
- Directory is **outside** the repo — do not copy dumps into `qa-artifacts/` or commit them.

### When Docker is ready — intended dump procedure (not executed)

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$dir = "C:\Users\Lokesh vella\Desktop\lumenx-secure-backups\production\kmpzflsurepjwqnfqyld\$ts"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# Always pin production ref — never rely on default link (staging)
npx supabase db dump --linked --project-ref kmpzflsurepjwqnfqyld `
  -f "$dir\schema-public.sql" -s public

npx supabase db dump --linked --project-ref kmpzflsurepjwqnfqyld `
  --data-only -f "$dir\data-public.sql"

Get-FileHash -Algorithm SHA256 "$dir\schema-public.sql","$dir\data-public.sql" |
  Out-File "$dir\SHA256.txt"
```

Expected contents: `public` schema DDL (tables, functions, triggers, indexes, constraints, policies as emitted by `pg_dump`) plus data for Transport/Admin/Connect-related tables in `public`.  
**Excluded by design:** internal Supabase schemas (auth internals beyond public, storage internals, etc. per CLI dump filtering). Document excludes after first successful run.

### Integrity verification (this pass)

| Check | Result |
|-------|--------|
| Dump file exists | **No** |
| Non-zero size | **N/A** |
| SHA-256 | **N/A** |
| Valid dump format / pg tools inspect | **N/A** |
| Transport tables present in dump | **N/A** |
| Not schema-only when data dump requested | **N/A** |
| Metadata (project + time) | Directory prepared; dump metadata pending |

Dry-run previously proved connectivity to production; **dry-run output must not be saved** (can include ephemeral credentials).

### Restore test

| Check | Result |
|-------|--------|
| Isolated restore environment | **Not available / not run** |
| Restore over production/staging | **Forbidden — not done** |
| Label | **No backup generated — not restore-tested** |

---

## 9. Five legacy conflict reconciliation details

Full worksheet: `qa-artifacts/_prod-location-conflict-reconciliation.md`  
UUID inventory: `qa-artifacts/_prod-location-conflict-inventory.json`

**No production rows were updated.**

| # | Kind | Pickup | Drop | Determinable common location? | Decision needed |
|---|------|--------|------|-------------------------------|-----------------|
| 1 | null pickup + drop | *(none)* | **Narendra center** | Proposal only: use drop | Confirm dual-write to Narendra center |
| 2 | null pickup + drop | *(none)* | **Narendra center** | Proposal only: use drop | Confirm |
| 3 | **true conflict** | **E2E Gate** | **E2E School** | **No** | Explicit choose Gate vs School (or other) |
| 4 | null pickup + drop | *(none)* | **E2E School** | Proposal only: use drop | Confirm |
| 5 | null pickup + drop | *(none)* | **School** | Proposal only: use drop | Confirm |

Migration must **preserve** these values. Do not auto-reconcile. Record 3 must not be silently overwritten by scripts.

---

## 10. Recovery procedure (when a verified backup exists)

### A. Prefer verified logical dump (once created)

1. Provision an **isolated** empty Postgres/Supabase scratch project (never prod/staging).  
2. Restore schema dump, then data dump.  
3. Validate enrollment stop pairs against `_prod-location-conflict-inventory.json`.  
4. Only then consider production remediation options.

### B. Additive migration rollback (not a backup substitute)

If migration `20261101140000` is later applied and only schema objects are unwanted:

- Drop new policies/tables/index/columns listed in prior reports.  
- Confirm pickup/drop still match inventory.  
- This **does not** replace a verified backup if data corruption occurs beyond additive DDL.

### C. PITR / daily backup restore (when enabled & listable)

1. Confirm earliest/latest restore points in Dashboard.  
2. Schedule maintenance window.  
3. Restore via Dashboard or `supabase backups restore --project-ref kmpzflsurepjwqnfqyld --timestamp <epoch>` **only with owner approval**.  
4. Expect downtime; verify app connectivity after restore.

### Current limitation

Without listable physical backups, PITR points, or a verified logical dump, **full recovery from a failed/corrupt migration state is not evidenced**.

---

## 11. Remaining risks

1. Production plan unknown via CLI — Free vs Pro changes whether platform daily backups even exist.  
2. PITR off; enabling requires **paid add-on + owner authorization**.  
3. **WSL missing** → Docker Linux engine cannot start → logical dump blocked.  
4. No local PostgreSQL client tools as an alternate dump path.  
5. No restore drill performed.  
6. Five legacy asymmetries need human decisions after (not during) migration.  
7. Accidental use of staging-linked CLI without `--project-ref` — mitigated by documenting mandatory production ref.

---

## 12. Exact next steps (in order)

1. **Operator (blocking):** Install WSL (`wsl --install` elevated), reboot if required, then confirm `docker version` shows a Server version.  
2. **Owner:** Confirm Supabase plan for `kmpzflsurepjwqnfqyld` in Dashboard Billing.  
3. **Owner:** Open Database → Backups; record whether daily backups exist + latest timestamp + retention. Attach evidence.  
4. **Owner (optional):** Explicitly authorize PITR add-on if desired; wait for recovery window to populate; re-audit CLI `backups list`.  
5. **Re-run** this backup preparation: create timestamped dumps under  
   `C:\Users\Lokesh vella\Desktop\lumenx-secure-backups\production\kmpzflsurepjwqnfqyld\<timestamp>\`  
   with SHA-256 files.  
6. Optionally restore dumps into an **isolated** scratch DB and verify.  
7. Update this report to **BACKUP READY** only when a usable recovery path is proven.  
8. Only then request separate authorization for **production migration** (still not automatic).

---

## Explicit non-actions this pass

- No production migration  
- No application deploy  
- No UPDATE/DELETE/TRUNCATE on production  
- No RLS/schema changes  
- No automatic reconciliation of the five legacy records  
- No secrets printed or committed  
- No dump committed to Git  
- No `wsl --install` / billing / PITR changes  
- No `supabase db dump` execution (Docker Server unavailable / timed out)  
- No `docker info` hang (skipped after version timeout)

---

### Verified vs unverified (this pass)

| Item | Status |
|------|--------|
| Production ref `kmpzflsurepjwqnfqyld` | Previously confirmed |
| Docker Server readiness | **Verified FAIL** (timeout) |
| WSL present | **Verified FAIL** (not installed) |
| Logical dump file + SHA-256 | **Unverified / not created** |
| Dump integrity / Transport data presence | **Unverified** |
| Isolated restore | **Unverified** |
| Platform physical backups / PITR points | **Still unverified** (prior CLI: null / disabled) |

---

**STOP / NO-GO.** Install WSL and confirm healthy `docker version` + `docker info` before any dump. Do not migrate production until **BACKUP READY**.
