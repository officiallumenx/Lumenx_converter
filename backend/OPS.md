# LumenX API — operations runbook

Day-2 ops for OTP login, subscription write-lock, and commercial lifecycle sync.
Deploy packaging lives in **[DEPLOY.md](./DEPLOY.md)**.

---

## Headline overall backend — **100%**

| Layer | Scope | Status |
|-------|-------|--------|
| **Product-ready** | Phase 1 Steps 1–6 + Phase 2 Steps 7–10 | **100%** |
| **Post-launch (V1.5)** | `grade_scheme`, `timetable_publication`, storage hard-deny | **100%** |
| **Long-term blueprint (V1+V1.5+V2)** | Domains, tables, compat/derived views, MVs, mark_publication | **100%** |
| **Headline overall** | Full backend against the agreed blueprint + finish plan | **100%** |

**Not counted against overall % (by design):** school-fee online gateway and traffic-grade maps engine (product policy). Live prod cutover (credentials, migrate-on-prod, institute E2E) is ops go-live, not missing backend code.

---

## Product-ready backend status — **100%**

| Phase | Steps | Status |
|-------|-------|--------|
| **Phase 1** | 1–6 (OTP, durable store, write-gate, lifecycle, deploy, ops) | **100% Done** |
| **Phase 2** | 7–10 (workers, product gaps, hardening, optional depth) | **100% Done** |
| **Product-ready (Steps 1–10)** | — | **100%** |

School-fees stay office/reception only by product policy (not a Steps 1–10 gap).

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

## Firebase (Phase 1–4)

| Concern | Status |
|---------|--------|
| **FCM** | Unchanged |
| **Client Auth** | All six apps: `VITE_AUTH_PROVIDER=firebase\|supabase` |
| **Session exchange** | `POST /api/v1/auth/firebase/session` |
| **Supabase Auth** | Still `requireAuth` Bearer; Twilio/Resend kept for `provider=supabase` |
| **Rollback** | Set `VITE_AUTH_PROVIDER=supabase` (rollback; default is firebase) |

Apps migrate interactive login to Firebase when provider=firebase; API Authorization remains Supabase access token after exchange.

## 1. OTP login

Notebook auth workflows (Nexus / Admin / Connect / signup) use the same delivery layer.

| Purpose | Endpoints |
|---------|-----------|
| Staff Admin | `/api/v1/auth/staff/*` (dual OTP + password + PIN) |
| Parent (legacy) | `/api/v1/auth/parent/*` |
| Connect T/P/S | `/api/v1/auth/connect/*` |
| Nexus operators | `/api/v1/auth/nexus/*` |
| Signup verify | `/api/v1/auth/signup/*` |

Server PIN + username live on existing `user_profile` (scrypt hash). Passwords remain in Supabase Auth.

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

For **real E2E** of Twilio/Resend OTP channels, set `OTP_DELIVERY_MODE=live` and configure providers.
When apps use `VITE_AUTH_PROVIDER=firebase`, Admin uses Firebase **phone OTP** or
Firebase **email/password**. Numeric email OTP is not part of the Firebase path.

### Nexus cold-start operator

```bash
# Once per environment — creates auth user + user_profile + platform_operator (nexus_root)
# Set NEXUS_BOOTSTRAP_PASSWORD in backend/.env first (see .env.example).
node scripts/bootstrap-nexus-operator.mjs
```

Required before Admin institute registration can be approved in Nexus.

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

## 8. Optional depth (Phase 2 Step 10) — **100% complete**

| Module | Workflow | Status |
|--------|----------|--------|
| **Activity notify** | Creating a practice session or achievement fans out inbox notifications to team students/guardians | Done |
| **Online checkout** | `POST /api/v1/subscriptions/online-checkout` (provider `demo`/`webhook`) → recorded online payment; `GET .../online-checkout/pending`; `POST /api/v1/webhooks/payments/:provider` confirms → same verify/activate path as Nexus | Done |
| **Transport approach** | Driver GPS ping evaluates 30 / 15 / 5 min ETA bands (optional `speed_kmh`); parents notified once per trip×band; live portal returns `approach` (distanceM / etaMinutes / withinRadius / band) | Done |
| **Sports V2 satellites** | venue, equipment, tournament, match_result, coach_note, sports_attendance, team_selection (+member), medical_fitness, activity_calendar_event — full CRUD under `/api/v1/activity/*` with RLS (migration `20260905120000`) | Done |

**Product policy (not Step 10 incomplete):** school-fees stay office/reception only — no learner fee payment gateway.

---

## Post-launch (V1.5) — **100%**

| Table | Domain | Status |
|-------|--------|--------|
| `grade_scheme` | Marks / exams — letter/grade band config per institute | Done (migration `20260905140000`) |
| `timetable_publication` | Timetable — durable publish event per section | Done (migration `20260905141000`) |

- `grade_scheme`: CRUD under `/api/v1/marks/grade-schemes` with bands JSONB validation + `resolveGradeFromScheme` helper. Staff write, all members read.
- `timetable_publication`: Persisted on every `POST /api/v1/timetable/publish-section`; list/get via `/api/v1/timetable/publications`. Staff read, members read.

---

## Long-term blueprint (V1+V1.5+V2) — 100%

### New table

| Table | Domain | Migration |
|-------|--------|-----------|
| `mark_publication` | Marks — durable publish event per mark_entry | `20260905150000_mark_publication.sql` |

### Renamed tables (blueprint → actual)

Blueprint names map to concrete tables — compatibility views alias the originals:

| Blueprint name | Actual table | Compat view? |
|----------------|--------------|-------------|
| `trip` | `transport_trip` | `trip` (view) |
| `boarding_event` | `transport_boarding_event` | `boarding_event` (view) |
| `emergency` | `transport_emergency` | `emergency` (view) |
| `diary_submission` | `diary_day` + `diary_day_row` | `diary_submission` (view) |
| `role_permission` | `institute_access_role_permission` | `role_permission` (view) |

### Blueprint compatibility views (migration `20260905151000`)

Read-only views that alias renamed entities so blueprint names resolve:

- `diary_submission` → `diary_day`
- `role_permission` → `institute_access_role_permission`
- `trip` → `transport_trip`
- `boarding_event` → `transport_boarding_event`
- `emergency` → `transport_emergency`

### Derived reporting views (migration `20260905152000`)

| View | Purpose |
|------|---------|
| `attendance_pending` | Sections with no submitted register today |
| `platform_readonly_state` | Institutes whose subscription implies read_only |
| `fee_dues` | student_fee rows with outstanding balance |
| `subscription_quote` | Derived quote: active_student_count × assigned_rate |
| `payment_receipt` | Recorded fee_payment rows for receipt use |
| `attendance_daily_summary` | Marks aggregated by institute/section/date |
| `institute_people_counts` | Active students/teachers/parents per institute |
| `transport_trip_today` | Today's non-deleted trips |
| `notification_unread_counts` | Unread notification counts per user |
| `careers_open_jobs` | Active career_job listings (status=open) |
| `mark_publication_current` | Latest publication per mark_entry |

### Materialized rollup views (migration `20260905153000`)

| MV | Granularity | Refresh |
|----|------------|---------|
| `mv_attendance_monthly` | institute × year_month | `refresh_blueprint_rollups()` |
| `mv_fee_collection_monthly` | institute × year_month | `refresh_blueprint_rollups()` |
| `mv_platform_network_metrics` | per institute (lifecycle + plan) | `refresh_blueprint_rollups()` |
| `mv_institute_kpi_snapshot` | per institute (students, teachers, complaints, trips) | `refresh_blueprint_rollups()` |

Refresh all: `SELECT public.refresh_blueprint_rollups();` (service_role).

### API routes (mark publications)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/marks/publications?institute_id=&section_id=&exam_id=` | List publications |
| `GET` | `/api/v1/marks/publications/:id` | Get single publication |

Publish (`POST /api/v1/marks/entries/:id/publish`) now also inserts a `mark_publication` row and returns `publicationId` in the response DTO.

### Product policy exclusions

These remain **product policy decisions**, not blueprint table gaps:

- **School-fee online payment gateway** — school fees stay office/reception only; no learner fee checkout.
- **Traffic-grade maps engine** — no real-time Google/Mapbox routing; GPS approach uses distance-band estimation.

### Architecture note

Business "RPCs" referenced in blueprint documents are implemented as **Hono domain services** (authoritative writes via service_role), not as Postgres RPCs. All mutations flow through the API layer.

---

## 9. Quick incident order

1. `GET /api/v1/health` and `/api/v1/health/ready`
2. Confirm `NODE_ENV`, CORS, Supabase, Firebase, OTP providers
3. OTP issues → migration + provider credentials
4. Unexpected locks → Nexus `sync-lifecycle` + check allowlist / offline pay
5. Missed announcements/alerts/diary nudges → check `background_jobs_worker_started` / `BACKGROUND_JOBS_INTERVAL_MS`
6. Hire / leave 403 / upload 409 → Step 8 gates above
7. 429 storms → raise `RATE_LIMIT_*` or check abusive IP
8. Duplicate payments / stuck FCM → Idempotency-Key + FCM retry columns
9. Online pay stuck → `ONLINE_PAYMENT_PROVIDER` + webhook secret + payment `provider_ref`
10. Deploy path → **DEPLOY.md** (build, Docker, PM2, smoke)
