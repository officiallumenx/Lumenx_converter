# LumenX — Gateway warning fix deployment report

**Date:** 2026-10-29  
**Local commit:** `3297f8b4a70e151018700a0c8366ef21f8ff258e`  
**Branch:** `fix/cloudflare-workers-build-upload` (ahead of origin by 3)  
**GitHub push:** **BLOCKED** — `Permission denied to vellalokesh2004`; `gh` not logged in  
**Railway deploy:** **SUCCESS** (already live; re-verified this session — no re-upload needed)

---

## 1. Diff review — clean

Commit `3297f8b4` contains only:

| Area | Files |
|------|--------|
| Notification dedupe | `backend/src/domains/notifications/repository.ts`, `service.ts`, `backend/src/db/errors.ts`, `backend/tests/helpers/mock-supabase.ts` |
| FCM reclaim / adaptive polling | `fcm-worker.ts`, `fcm-worker-runner.ts`, `health.ts` (comment) |
| Tests | `dedupe-insert.test.ts`, `fcm-reclaim.test.ts`, `fcm-worker-runner.test.ts`, `notifications.test.ts`, `db-errors-map.test.ts` |
| Reports | `notification-dedupe-23505-incident-report.md`, `supabase-api-gateway-warnings-report.md` |

No frontend, no migrations, no unique-index DDL, no unrelated app changes. Working tree has **no modified tracked files** (only unrelated untracked `qa-artifacts/` / `dist-out`).

---

## 2. Targets verified

| Item | Value |
|------|--------|
| Branch | `fix/cloudflare-workers-build-upload` |
| Remote | `origin` / `lumenx_converter` → `https://github.com/officiallumenx/Lumenx_converter.git` |
| Railway project | `LumenX` (`555fe147-…`) |
| Service | `Lumenx_converter` |
| Environment | `production` (linked) |
| URL | `https://api.lumenxtech.in` |
| Deployment ID | `7e06b252-53b1-48bd-94e2-e7f98f5b02c1` |
| Deployed at | **2026-10-29 18:46:25 +05:30** |
| Status | **SUCCESS** / **Online** |
| Prod Supabase | `kmpzflsurepjwqnfqyld` (Railway `SUPABASE_URL` matches local prod `.env`) |

Uncommitted commits ahead of origin (not on GitHub): `86b6717f`, `cccdd704`, `3297f8b4`.

---

## 3. Tests / build / known failures

| Check | Result |
|-------|--------|
| Targeted vitest (35) | **PASS** (re-run 21:14 IST) |
| `npm run build` (`@lumenx/api`) | **PASS** |
| `npm run typecheck` | **FAIL (pre-existing)** — `packages/utils` DOM/`window`/`document` errors; unchanged by this fix |
| `npm run lint` | **FAIL (pre-existing)** — ESLint 9 missing `eslint.config.*` in backend; unchanged |

These failures were **not** concealed or “fixed” by unrelated edits.

---

## 4–6. Commit / push / deploy

| Step | Result |
|------|--------|
| Commit | **Already present** `3297f8b4` — `fix: make notification dedupe idempotent and throttle idle FCM polling` (no new commit created; tree clean for intended files) |
| Push | **FAILED** again this session: `Permission to officiallumenx/Lumenx_converter.git denied to vellalokesh2004` |
| Deploy | Live deployment `7e06b252…` from prior `railway up` at 18:46 IST; **not** re-deployed (healthy, correct service) |
| Deployed version | Local upload of tree at `3297f8b4` (GitHub SHA not on remote). Health `release` remains `null` (no `GIT_SHA` env). |

---

## 7. Post-deploy health / notifications / FCM (T+~2.5h)

### Health

```json
{"service":"lumenx-api","status":"ok","version":"v1","env":"production","release":null}
```

Ready: `status=ready`, supabase `ok`, FCM `workerEnabled/workerRunning/messagingReady=true`, project `lumenx-2026`.

### Idempotent insert probe (disposable; soft-deleted)

```json
{
  "firstCreated": true,
  "secondCreated": false,
  "sameId": true,
  "liveRowCountBeforeDelete": 1,
  "recipientInsertedOrExisting": 1
}
```

### Unique index still enforced (controlled raw duplicate; soft-deleted)

- Duplicate raw insert → **23505** `notification_institute_dedupe_uidx` — index **not** removed.

### Ongoing worker behaviour

- `background_jobs_tick` every ~60s with `diaryEmitted=14` continues (expected diary reminder attempts).
- **0** new live notifications / recipients since ~deploy window (`sinceDeployApprox` / last 60m counts = **0**).
- Interpretation: diary ticks now hit **idempotent pre-read** (no insert storm) rather than INSERT→23505.
- Railway log sample (~200 recent lines): **0** `23505`, **0** `background_jobs_job_failed`, **0** `fcm_worker_tick_failed`, **0** `[ERROR]`.
- FCM queue: `pending=0`, `sending=0`; no new failed attempts in last 60m.
- Live `diary-reminder:%` rows remain **488** (pre-existing inventory intact).

---

## 8. Baseline vs post-deploy measurements

### Pre-deploy baseline (user / prior dashboard)

| Metric | Value |
|--------|--------|
| API Gateway warnings / 24h | **3,547** |
| API Gateway warnings / 60m | **120** |
| PG 23505 on `notification_institute_dedupe_uidx` | Present at scale (~1:1 with warnings) |

### Post-deploy (this session, ~T+150 min after 18:46 IST)

| Metric | Evidence | Verdict |
|--------|----------|---------|
| Railway app errors for dedupe / jobs | **0** in sampled logs while diary keeps ticking | Strong positive |
| New notification rows while diaryEmitted=14/min | **0** since deploy | Conflicts avoided at insert site |
| FCM delivery health | empty pending/sending; no new fails | Healthy |
| Unique index | Still rejects raw duplicates with 23505 | Preserved |
| Supabase **dashboard** API Gateway warnings (30m / 60m / 24h tiles) | **Not available via CLI** in this session (no Management API token) | **Incomplete — needs your dashboard screenshot** |

**Do not claim the issue is fully resolved** until Supabase Dashboard API Gateway warning counts for equivalent 60m (and preferably 24h) windows are compared to the 120 / 3,547 baselines. Application-side evidence strongly indicates the 409/23505 storm stopped; dashboard confirmation is still required.

---

## Blockers

1. **GitHub push** — authenticate with write access to `officiallumenx/Lumenx_converter` (`gh auth login` or credential for an authorized account), then:
   ```bash
   git push -u origin fix/cloudflare-workers-build-upload
   ```
2. **Dashboard warning counts** — please capture Supabase → API → last 60 minutes / 24 hours warning tiles for `kmpzflsurepjwqnfqyld` and compare to baseline.

---

## Explicit non-actions

- No production SQL / migrations.
- Unique index not dropped or altered (verified still enforcing).
- No frontend deploy.
- No second Railway upload (existing deploy healthy).
- No commit of unrelated untracked artifacts.
