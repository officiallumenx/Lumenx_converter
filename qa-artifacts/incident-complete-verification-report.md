# LumenX Production Incident — Complete Verification Report

**Generated:** 2026-10-29 ~21:21 IST  
**Mode:** Verify GitHub / Railway / Supabase / notifications — no force-push, no destructive SQL, no new production deploy

---

## Executive status

| Area | Status |
|------|--------|
| Local fix commit | **Present** `3297f8b4` |
| GitHub push | **BLOCKED** — `gh` not logged in; prior credential is `vellalokesh2004` (no write) |
| Railway production | **Online / SUCCESS** deployment `7e06b252` (local `railway up` at 18:46 IST, aligned with fix commit) |
| API health | **ok / ready**; FCM worker running |
| Notification correctness | **PASS** (probes + diary audit) |
| Regression tests (targeted) | **46 PASS**; transport suite has **pre-existing** failures unrelated to dedupe |
| Supabase dashboard gateway counts | **NOT AVAILABLE** via CLI — screenshots required |
| Incident fully closed? | **Not yet** — push + dashboard metrics still open |

---

## 1. GitHub

| Item | Evidence |
|------|----------|
| Authenticated `gh` account | **None** — `gh auth status` → not logged in |
| Git `user.email` (local identity only) | `official.lumenx@gmail.com` |
| Windows Git Credential Manager | Has `git:https://github.com` entry that previously authenticated as **`vellalokesh2004`** (403 on push) |
| Branch | `fix/cloudflare-workers-build-upload` |
| Local HEAD | `3297f8b4a70e151018700a0c8366ef21f8ff258e` |
| Remote tip (pre-push) | `295bc140…` — **does not contain** `3297f8b4` |
| Ahead of origin | **3** commits: `86b6717f`, `cccdd704`, `3297f8b4` |
| Push result | **Not completed** this session |

### Manual unblock (required)

In a local terminal (interactive):

```powershell
gh auth login
```

Recommended choices:
1. GitHub.com  
2. HTTPS  
3. Login with a browser  
4. Authenticate as an account with **write** access to `officiallumenx/Lumenx_converter` (org owner / collaborator — typically `official.lumenx` / org member, **not** `vellalokesh2004` unless that account is granted write)

Then:

```powershell
cd "c:\Users\Lokesh vella\Desktop\lumenx converter"
gh auth status
gh api repos/officiallumenx/Lumenx_converter --jq ".permissions"
git push -u origin fix/cloudflare-workers-build-upload
git ls-remote origin refs/heads/fix/cloudflare-workers-build-upload
git fetch origin
git rev-parse 3297f8b4
git branch -r --contains 3297f8b4
```

Reply in chat when `gh auth status` shows a write-capable account; verification of the push will continue from there.

**Do not** force-push or change remotes.

Untracked local noise (not committed): `qa-artifacts/*` probes/reports, `apps/admin-desktop/dist-out/`. No modified tracked files.

---

## 2. Railway

| Item | Value |
|------|--------|
| Project | LumenX (`555fe147-…`) |
| Service | `Lumenx_converter` |
| Environment | `production` |
| URL | `https://api.lumenxtech.in` |
| Deployment ID | `7e06b252-53b1-48bd-94e2-e7f98f5b02c1` |
| Deployed at | **2026-10-29 18:46:25 +05:30** |
| Status | **SUCCESS / Online** |
| Deployed commit (GitHub SHA) | **Not verifiable via Git** — upload was `railway up` of local tree when HEAD was `3297f8b4` (commit 18:45:57; deploy 18:46:25). Health `release` is `null` (no `GIT_SHA`). |
| Supabase URL on service | `https://kmpzflsurepjwqnfqyld.supabase.co` |

### Health (re-checked this session)

- `GET /api/v1/health` → `status=ok`, `env=production`
- `GET /api/v1/health/ready` → `ready`; supabase `ok`; FCM `workerRunning=true`, `messagingReady=true`

### Logs (re-checked)

Sample ~400 lines / ~2h worker activity:
- `fcm_worker_started` once at deploy boot
- Continuous `background_jobs_tick` with `diaryEmitted=14`
- **0** `23505` / `notification_institute_dedupe` / `background_jobs_job_failed` / `fcm_worker_tick_failed` / `[ERROR]`

**No new Railway production deployment triggered** (correct revision already Online).

---

## 3. Supabase metrics

### Baseline (pre-fix, reported)

| Window | API Gateway warnings | PG 23505 dedupe |
|--------|----------------------|-----------------|
| 24h | 3,547 | recurring |
| 60m | 120 | ~aligned with warnings |

### Post-deploy (this session)

| Source | Result |
|--------|--------|
| Supabase Dashboard API / Analytics | **No Management API / MCP access** in this environment |
| App DB (service role, read) | **0** new live notifications since ~deploy; diary inventory intact |
| Railway logs | **0** sampled 23505 |
| Dashboard gateway warning tiles | **Unknown — need screenshots** |

**Cannot claim gateway warnings declined** without comparable dashboard numbers.

### Exact screenshots needed

Open Supabase project **`kmpzflsurepjwqnfqyld`**:

1. **Project → Reports / API** (or Home overview cards showing **API Gateway warnings**)
   - Capture **Last 60 minutes**
   - Capture **Last 24 hours**
2. **Logs → Postgres**
   - Filter / search: `23505` and `notification_institute_dedupe_uidx`
   - Note approximate count or density since **2026-10-29 18:46 IST** vs earlier today
3. **Logs → API** (if available)
   - Filter path containing `/notification` and status **409**

Also note total request volume in the same windows so we can normalize.

---

## 4. Notification reliability

### Code (confirmed in tree at `3297f8b4`)

- Idempotent `insertNotification` (pre-read → insert → 23505 re-read)
- Service skips recipients + FCM when `created: false`
- FCM reclaim uses `.lt(attempted_at, cutoff)`
- Adaptive FCM delay via `nextFcmWorkerDelayMs` (4s → up to 30s idle)
- Unique index **unchanged** (raw duplicate still 23505)

### Safe production probes (disposable / soft-deleted or read-only)

| Check | Result |
|-------|--------|
| Create + replay same dedupe key | Same ID; second `created=false`; 1 live row; 1 recipient |
| Raw duplicate insert | Still **23505** on `notification_institute_dedupe_uidx` |
| New notifications since deploy | **0** (while diary ticks continue) |
| FCM queue | pending=0, sending=0; no new fails last 60m |

### Diary `diaryEmitted=14` with zero new rows — explained

- Worker still **attempts** emit for due reminders each minute and counts successful emit calls.
- Rows for those keys already exist (sample of 20 latest live `diary-reminder:%`):
  - **20/20** have recipients
  - **20/20** have `sent` delivery attempts (in_app; some also FCM)
  - Created ~**2026-10-29 00:00 UTC** (before this deploy)
- Idempotent path returns existing notification without insert → **no 23505**, no extra recipients/FCM → **expected success**, not a silent drop of undelivered reminders.

No artificial pushes sent to production users beyond the soft-deleted probe row.

---

## 5. Build and testing (re-run this session)

| Suite | Result |
|-------|--------|
| dedupe-insert, fcm-reclaim, fcm-worker-runner, notifications, db-errors-map, fcm-worker, background-jobs, diary | **46/46 PASS** |
| `npm run build` (`@lumenx/api`) | **PASS** |
| `tests/transport.test.ts` (broad) | **3 FAIL / 51 PASS** — school arrival / reminder assertions; **not** introduced by dedupe commit scope |
| transport-notification-emit unit path | present under `src/domains/transport/`; severity + emit covered separately when run |
| `npm run typecheck` | **FAIL pre-existing** — `packages/utils` DOM/`window` |
| `npm run lint` | **FAIL pre-existing** — missing `eslint.config.*` |

Files in fix commit (14): notification repository/service/errors, FCM runner/worker, tests, two qa reports. No frontend.

---

## 6. Remaining work

1. **You:** `gh auth login` with write-capable org account → notify chat → push will be completed/verified.
2. **You:** Supabase dashboard screenshots (60m + 24h API Gateway warnings; Postgres 23505 filter since 18:46 IST).
3. After (1)+(2): compare to baseline 120 / 3,547 and close or reopen incident with evidence.
4. Optional later: set Railway `GIT_SHA` so health `release` matches commits; fix Git Credential Manager so push stops using `vellalokesh2004`.

### Can the incident be considered resolved?

**Application fix: deployed and behaving correctly** (health, probes, diary audit, Railway log silence on 23505).  
**Incident fully closed: NO** until GitHub contains `3297f8b4` and Supabase dashboard warning counts confirm a decline in comparable windows.
