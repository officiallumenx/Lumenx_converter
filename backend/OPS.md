# LumenX API — operations runbook

Day-2 ops for OTP login, subscription write-lock, and commercial lifecycle sync.
Deploy packaging lives in **[DEPLOY.md](./DEPLOY.md)**.

---

## Phase 1 status (launch blockers)

| Step | Topic | Status |
|------|-------|--------|
| 1 | Real OTP delivery (SMS/email) | Done |
| 2 | Durable OTP store (`login_otp_challenge`) | Done |
| 3 | Server subscription write-gate | Done |
| 4 | Lifecycle sync worker (trial → grace → read_only) | Done |
| 5 | Production deploy packaging | Done — see DEPLOY.md |
| 6 | Ops docs (this file + README) | Done |

---

## 1. OTP login

### Workflows

| Portal | Request | Verify |
|--------|---------|--------|
| **Parent (Connect)** | `POST /api/v1/auth/parent/request-otp` | `POST /api/v1/auth/parent/verify-otp` |
| **Staff / Admin** | `POST /api/v1/auth/staff/request-otp` | `POST /api/v1/auth/staff/verify-otp` (+ password where required) |

### Delivery modes

| Mode | When | Behavior |
|------|------|----------|
| **demo** | `development` / `test` default (`OTP_DELIVERY_MODE=demo`) | No provider call; fixed `123456`; response may include `devOtp` |
| **live** | `OTP_DELIVERY_MODE=live` **or** `NODE_ENV=production` | Real SMS/email; random 6-digit; **never** echo OTP |

### Providers

- SMS: `OTP_SMS_PROVIDER=twilio|webhook` (+ Twilio or webhook vars)
- Email: `OTP_EMAIL_PROVIDER=resend|webhook` (+ Resend or webhook vars)
- Production boot requires at least one non-`none` provider

### Durable store (multi-instance)

- Table: `login_otp_challenge` (migrations `20260827470400_…` + `20260827470500_…_attempts`)
- OTP stored as **SHA-256 hash** only; service_role access
- Atomic upsert on `(purpose, challenge_key)` — safe across API instances
- Timing-safe hash compare on verify
- **Max 5 failed verifies** then challenge is burned (must request a new OTP)
- TTL **5 minutes**; resend cooldown **30 seconds**
- Survives API restart and horizontal scale (shared Postgres)

### Ops checks

```bash
# Migration present?
npm run migrations:list --workspace=@lumenx/api | findstr login_otp

# Live smoke (health only)
SMOKE_SKIP_AUTH=1 npm run smoke --workspace=@lumenx/api
```

**Symptom → fix**

| Symptom | Likely cause |
|---------|----------------|
| OTP works on one instance, fails on another | Migration not applied on prod |
| Production returns `devOtp` | Impossible if boot gate + live mode — check you are not on a non-prod build |
| `OTP SMS is misconfigured` | Missing Twilio / webhook env |
| Parent never receives SMS | Wrong `OTP_SMS_DEFAULT_COUNTRY_CODE` or provider credentials |

---

## 2. Subscription write-gate (billing lock)

### Policy

After auth, mutating institute calls (`POST` / `PUT` / `PATCH` / `DELETE`) are blocked when derived lifecycle access mode is **read_only** (`lifecycle` `read_only` or `registered`).

- **Grace / trial / active** → writes allowed
- **Platform operators** → bypass
- **GETs** → always allowed (data stays readable)

### Allowlist (still writable when locked)

- `/api/v1/health`, `/api/v1/me`
- `/api/v1/auth/parent`, `/api/v1/auth/staff`
- `/api/v1/subscriptions` (renew / offline pay unlock path)
- `/api/v1/registrations`, `/api/v1/product-feedback`

### Client signal

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Institute subscription is read-only. Renew billing to restore edits.",
    "details": {
      "reason": "SUBSCRIPTION_READ_ONLY",
      "lifecycleStatus": "read_only",
      "instituteId": "…"
    }
  }
}
```

### Unlock workflow

1. Institute admin submits offline payment / renewal under `/api/v1/subscriptions/...`
2. Nexus billing verifies payment → paid period → lifecycle `active`
3. Write-gate derives live from dates + period; mutations resume

**Symptom → fix**

| Symptom | Likely cause |
|---------|----------------|
| All schools locked | Lifecycle sync stuck / wrong dates; flush sync (below) |
| Locked but billing POST also 403 | Path not under `/subscriptions` allowlist |
| UI shows active, API 403 | Stale FE; trust API `details.lifecycleStatus` |

---

## 3. Commercial lifecycle cron

### What it does

Background worker (started with the API process):

1. Scans all `subscription` rows
2. Derives status from trial / grace / paid period dates
3. Persists when drifted (`trial_active` → `trial_expiring` → `trial_expired` / `grace_period` → `read_only`, or paid → `active`)
4. Marks `issued` / `pending` renewals past `due_at` as `overdue`

### Config

| Env | Default | Notes |
|-----|---------|-------|
| `SUBSCRIPTION_LIFECYCLE_SYNC_MS` | `3600000` (1h) | Set `0` to disable the loop |

### Manual flush (Nexus)

```http
POST /api/nexus/subscriptions/sync-lifecycle
Authorization: Bearer <platform JWT>
```

Allowed roles: `nexus_root`, `operations`, `billing`.

Response includes `updated`, `transitions`, `renewalsMarkedOverdue`.

### Ops checks

- Boot log: `subscription_lifecycle_worker_started`
- After flush: Nexus payment_overdue / renewal alerts should match DB `lifecycle_status`
- Write-gate still derives **live** even between ticks; cron keeps DB/UI/alerts aligned

**Symptom → fix**

| Symptom | Likely cause |
|---------|----------------|
| Worker disabled warning | Supabase not configured |
| Status stuck `trial_active` after grace | Worker interval `0` or process not running; run Nexus flush |
| Renewals never `overdue` | Missing `due_at` on renewal rows |

---

## 5. Background jobs (Phase 2 Step 7)

Interval worker (`BACKGROUND_JOBS_INTERVAL_MS`, default 60s) runs without a user session:

| Job | What it does |
|-----|----------------|
| **Announcements** | Publishes `scheduled` rows whose `scheduled_at` ≤ now + fans out notifications |
| **Alert rules** | Evaluates active rules per institute; persists fires + staff notify |
| **Diary reminders** | Overdue (yesterday) + end-of-day (today ≥ 16:00) for active teachers |

List endpoints still trigger the same logic for snappy UX; the worker covers institutes that nobody is browsing.

---

## 6. Product gaps (Phase 2 Step 8)

| Module | Workflow |
|--------|----------|
| **Careers hire** | `POST /api/v1/careers/applications/:id/convert-to-teacher` after `selected` / `offer_accepted` → creates `teacher`, links `converted_teacher_id` |
| **Leave decide** | Student leave: staff may decide any; plain teachers only if `teacher_assignment` covers the learner’s section |
| **Storage upload** | `upload` / metadata create hard-deny with **409** when usage + file would exceed Nexus `storage_quota` for the institute plan |

---

## 7. Hardening (Phase 2 Step 9)

| Control | Behavior |
|---------|----------|
| **Rate limit** | Per-IP window (`RATE_LIMIT_*`); auth OTP paths use tighter `RATE_LIMIT_AUTH_*`; **429** + `Retry-After` |
| **Idempotency-Key** | Optional header on payments / approve / convert / notify / leave decide / marks publish — durable replay via `api_idempotency_key` (migration `20260827470600`) |
| **FCM outbox retry** | Failed sends stay `pending` with backoff (`attempt_count` / `next_attempt_at`); permanent token errors → `failed` (migration `20260827470700`) |

Send `Idempotency-Key` (8–200 chars) on fee payments, offline pay, Nexus billing verify/reject, registration approve, admissions/careers convert, leave decide, mark publish, and notification emit for safe client retries.

---

## 8. Quick incident order

1. `GET /api/v1/health` and `/api/v1/health/ready`
2. Confirm `NODE_ENV`, CORS, Supabase, Firebase, OTP providers
3. OTP issues → migration + provider credentials
4. Unexpected locks → Nexus `sync-lifecycle` + check allowlist / offline pay
5. Missed announcements/alerts/diary nudges → check `background_jobs_worker_started` / `BACKGROUND_JOBS_INTERVAL_MS`
6. Hire / leave 403 / upload 409 → Step 8 gates above
7. 429 storms → raise `RATE_LIMIT_*` or check abusive IP
8. Duplicate payments / stuck FCM → Idempotency-Key + FCM retry columns
9. Deploy path → **DEPLOY.md** (build, Docker, PM2, smoke)
