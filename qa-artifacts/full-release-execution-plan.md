# LumenX — Full Release Execution Plan

**Date:** 2026-10-20  
**Branch:** `fix/cloudflare-workers-build-upload`  
**HEAD (pre-commit):** `c384e10e67809016fa221ea8d6310656a49ab2f1`  
**Upstream:** `origin/fix/cloudflare-workers-build-upload` (tip in sync before new commits)  
**Remotes:** `origin` / `lumenx_converter` → `https://github.com/officiallumenx/Lumenx_converter.git`  
**Ahead of `origin/main`:** 11 commits (pre-commit)

**Sources:** `final-release-file-manifest.md`, `final-release-validation-report.md`, `final-release-gate-report.md`, `final-transport-verification-report.md`, `release-file-set-review.md`, live CLI/tooling probes.

---

## 1. Scope decision (owner request)

Owner requested **all legitimate intended product changes**, not only the earlier curated core-web INCLUDE list.

| Category | Plan |
|----------|------|
| Admin / Connect / Transport / Nexus / API product + tests | **INCLUDE** |
| Leave / teacher / activity / shared `packages/*` dirty product churn | **INCLUDE** (re-reviewed as legitimate product work) |
| Staging E2E / transport probe harness | **INCLUDE** |
| Migration `20261020160000` + proposal docs | **INCLUDE** (git only; apply gated) |
| Curated Markdown QA reports | **INCLUDE** |
| `apps/admin-desktop/dist-out/**` | **EXCLUDE** (stale generated EXE; not auto-release) |
| Probe logs/JSON/operator `.mjs` under `qa-artifacts/` | **EXCLUDE** |
| `keystore.properties`, `*.jks`, `backend/.env*` | **EXCLUDE** (gitignored; never commit) |
| Admissions/Careers as advertised product | **EXCLUDE from claims** (Android scaffolding already on branch tip) |

---

## 2. Intended file groups (git)

### 2A. Commit group A — DB migration + proposals

- `supabase/migrations/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql`
- `docs/proposals/transport_vehicle_location_guardian_realtime_rls.sql`
- `docs/proposals/transport_vehicle_location_guardian_realtime_rls.md`
- `docs/proposals/20261020160000_transport_vehicle_location_guardian_realtime_rls.sql`
- `docs/proposals/transport_vehicle_location_guardian_realtime_rls_migration_formalization.md`

### 2B. Commit group B — API / Transport / Connect / Admin / Nexus product + tests + e2e

All currently dirty product/test paths under:

- `apps/admin/**` (modified)
- `apps/connect/**` (modified + untracked lazy/prefetch/leave tests)
- `apps/transport/**`
- `apps/nexus/**`
- `backend/**` (domains, tests, scripts, STAGING.md, package.json)
- `packages/auth`, `packages/module-attendance`, `packages/types` (dirty)
- `e2e/**`, `playwright.config.ts`, root `package.json`

### 2C. Commit group C — curated QA / release docs

Markdown only under `qa-artifacts/` that are release evidence (gate/manifest/validation/transport/cross-app/repair/recon + this plan and subsequent full-release reports). **Not** `*.txt` / probe `*.json` / operator `*.mjs`.

### 2D. Already on branch (no new commit needed; claim limits)

11 commits include CF Workers fixes, website downloads matrix, Admissions/Careers/Nexus Android scaffolding (~54+2+54 android paths). **Do not rewrite history.** Release notes must not advertise Admissions/Careers product or native readiness unless separately approved.

---

## 3. Secret / environment checks (no values)

| Item | Tracked? | Action |
|------|----------|--------|
| `apps/*/android/keystore.properties` | No (gitignore) | Never stage |
| `*.jks` / `*.keystore` | No | Never stage |
| `backend/.env`, `.env.staging` | No | Never stage |
| `apps/website/.env.production` | Yes (public `VITE_*`) | Already on HEAD; do not reprint values |
| Service-role / tokens in reports | N/A | Never print |

No trusted secret scanner binary found (`gitleaks` / `trufflehog` / `detect-secrets` absent). Manual path-type inspection used.

---

## 4. Supabase plan

| Project | Ref | Role |
|---------|-----|------|
| **Production / default linked** | `kmpzflsurepjwqnfqyld` | CLI default (`show:supabase-target`, `.temp/project-ref`) |
| **Staging** | `yveadybpntziyryxsrsu` | Prior GPS RLS apply + probe |

| Migration `20261020160000` | Status |
|----------------------------|--------|
| Staging remote | **Already present** (local+remote) |
| Production remote | **PENDING** (local only; remote empty) |

**Risk class:** RLS/policy + SECURITY DEFINER function + GRANT/REVOKE (not DROP TABLE / TRUNCATE). Still production-impacting for guardian GPS Realtime.

**Gate:** Do **not** `db push` / apply to production until owner explicitly replies:  
`APPROVE production migration 20261020160000 on kmpzflsurepjwqnfqyld`

See `full-release-database-report.md`.

---

## 5. Deployment targets

| Component | Mechanism | Current evidence |
|-----------|-----------|------------------|
| Backend API | Railway project `pure-quietude` / service `Lumenx_converter` → `https://api.lumenxtech.in` (Online) | Railway CLI logged in; **production deploy needs explicit approval** |
| Admin / Connect / Transport / Nexus / Website | Cloudflare Workers via `build` → `prepare-cf-worker-deploy.mjs` → `cf:upload` / `deploy` | `wrangler whoami` **failed** (fetch/connectivity) this session |
| Downloads host | Worker + R2 `lumenx-downloads`; `scripts/publish-downloads.mjs`; GH workflow `release-downloads.yml` (`production-downloads` env) | Requires CF token + bucket; local wrangler broken |

**Gate:** No production Railway up / CF upload / R2 publish without restored Wrangler auth **and** explicit owner approve for production publish.

---

## 6. Android release plan

| App | applicationId | versionName / versionCode | Commands |
|-----|---------------|---------------------------|----------|
| Admin | `com.lumenx.app.admin` | `1.0.14` / `14` | `npm run cap:aab` / `cap:apk` -w `@lumenx/app-admin` |
| Connect | `com.lumenx.app.connect` | `1.0.10` / `11` | same `-w @lumenx/app-connect` |
| Transport | `com.lumenx.app.transport` | `1.0.5` / `6` | same `-w @lumenx/app-transport` |

Signing: local `keystore.properties` present; configured `storeFile` **exists** (paths not logged).  
SDK: `%LOCALAPPDATA%\Android\Sdk` present (`ANDROID_HOME` was unset — must export for Gradle).  
Collect: `npm run releases:collect-apks` → `dist/releases/android/`.  
AAB = Play Console; APK = website download.

---

## 7. Windows EXE plan

| App | Script | Expected |
|-----|--------|----------|
| Admin desktop | `npm run dist -w @lumenx/app-admin-desktop` | NSIS installer under package `dist` / collected via `releases:collect-windows` |
| Nexus desktop | `npm run dist -w @lumenx/app-nexus-desktop` | Same pattern |

Existing `apps/admin-desktop/dist-out/LumenX-Admin-Setup.exe` dated **2026-10-18** — treat as **stale**, not a fresh release artifact. Prefer separate collect path `dist/releases/windows/` without deleting `dist-out` during audit.

---

## 8. Download host / website URLs

- Host: `downloads.lumenxtech.in` / R2 bucket `lumenx-downloads` (per `apps/downloads-host/README.md`)
- Publish: `node scripts/publish-downloads.mjs` or GH `Release downloads` workflow
- Website bake: committed public `VITE_*` APK/desktop URLs — **reachability unverified**
- Do not advertise Admissions/Careers downloads as released product

---

## 9. Blockers / required approvals (hard gates)

1. **PRODUCTION DB:** Explicit approve to apply `20261020160000` on `kmpzflsurepjwqnfqyld`.  
2. **CF Workers deploy/upload:** Fix Wrangler auth/connectivity; then approve production upload for Admin/Connect/Transport/Nexus/Website.  
3. **Railway API deploy:** Explicit approve to deploy `Lumenx_converter` production (`api.lumenxtech.in`).  
4. **R2 publish:** CF token + confirm overwrite policy for existing keys under `android/*.apk` / `windows/*-setup.exe`.  
5. **Branch policy:** Accept Admissions/Careers Android trees already on tip without advertising them.

---

## 10. Execution order

1. Inventory (this doc) — done.  
2. Safe git commit/push of §2 groups — proceed when file list safe.  
3. Stop for production migration approval.  
4. Stop for production deploy approval (after Wrangler restored).  
5. Build Android AAB/APK + Windows EXE locally where tooling allows.  
6. Publish downloads only after artifacts + host auth verified.  
7. Final report with PASS/FAIL/BLOCKED/NOT RUN per deliverable.
