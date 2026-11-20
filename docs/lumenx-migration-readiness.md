# LumenX Website Migration — Readiness Verification

**Date:** 2026-10-26  
**Scope:** Read-only verification only. No deploy, DNS, Worker, secret, or product-app changes.  
**Upstream audit:** `C:\Users\Lokesh vella\Downloads\play-astro-v1.0.0\docs\lumenx-two-website-audit.md`  
**Play project:** `C:\Users\Lokesh vella\Downloads\play-astro-v1.0.0`  
**Live marketing source:** `apps/website` (Worker `lumenx-website`)

Evidence labels used below: **VERIFIED** (ran/observed in this session) · **BLOCKED** (cannot proceed without owner/dashboard action) · **NOT VERIFIED** (not proven; do not treat as ready).

---

## Verdict

Staging on a **separate Cloudflare Pages project** is the correct next step (Strategy A from the audit). Production apex cutover is **not ready**.

**Hard blockers before cutover:** missing Play routes/redirects for several live URLs; no Astro sitemap; enquiry delivery secrets not configured on any host yet; `downloads.lumenxtech.in` DNS NXDOMAIN; dashboard confirmation of domain→Worker binding still required; Play not in Git.

---

## 1. Current production (`lumenx-website`)

### 1.1 Worker configuration — VERIFIED (local)

| Item | Value | Source |
|------|--------|--------|
| Worker name | `lumenx-website` | `apps/website/wrangler.jsonc` |
| Compatibility date | `2025-09-24` | same |
| Flags | `nodejs_compat` | same |
| Main | `dist/server/server.js` | same |
| Assets | binding `ASSETS` → `dist/client` | same |
| Plain vars (names + non-secret values in repo) | `LEAD_EMAIL_TO` = inbox address; `LEAD_FORMSUBMIT` = `false` | same |
| Wrangler secrets (`wrangler secret list`) | **empty list `[]`** | CLI 2026-10-26 |
| Account (CLI whoami) | Account name tied to `official.lumenx@gmail.com`; Account ID `740bacaa41610ef1c2e780ae76ba9bda` | `wrangler whoami` |

### 1.2 Version / deployment identifiers — VERIFIED (CLI)

**Current production deployment** (`wrangler deployments status --name lumenx-website`):

| Field | Value |
|-------|--------|
| Deployment created | `2026-10-24T17:21:24.001Z` |
| Author | `official.lumenx@gmail.com` |
| Active version ID | **`061059aa-462d-44e0-bb1b-01791258ab74`** (100%) |
| Version created | `2026-10-24T17:21:20.754Z` |
| Tag / message | empty |

**Newer uploaded version that is NOT the active deployment:**

| Version ID | Created |
|------------|---------|
| `8e1db344-1767-4784-bff0-27c61d55a1a1` | `2026-10-24T17:29:25.482Z` |

So a version exists after the live deployment; live traffic is still on `061059aa-…`. Confirm in the dashboard before relying on either ID for rollback targets.

**Recent deployments (sample, `wrangler deployments list` — last 10 only):** includes  
`061059aa-…` (2026-10-24T17:21), `519170cd-…`, `bbfc4971-…`, `cc8fcb0e-…`, `ce04b65a-…`, `bfe697ee-…`, and earlier same-day IDs.

**Early versions (2026-09-20/21 sample):** `7335656c-…`, `d6ed8cc3-…`, `7432b680-…`, `d14043f3-…`, `cec5631c-…`, `75a6d5a9-…`, `31c2e0df-…`, `6e363720-…`.

### 1.3 Live HTTP — VERIFIED (curl, `--max-redirs 0`, 2026-10-26)

| Path | Status | Notes |
|------|--------|--------|
| `/`, `/platform`, `/platform/{admin,connect,transport,admissions,careers}`, `/solutions`, `/modules`, `/pricing`, `/resources`, `/resources/{help,faq,downloads}`, `/about`, `/contact`, `/get-started`, `/login`, `/privacy`, `/terms`, `/cookies`, `/data-request` | **200** | |
| `/robots.txt`, `/sitemap.xml` | **200** | |
| `/api/leads` | **405** on non-POST (earlier probe) | POST-only API present |
| `/products` | **301** → `/platform` | |
| `/products/admin` | **301** → `/platform/admin` | |
| `/products/nexus` | **301** → `/about` | |
| `/download`, `/downloads` | **301** → `/resources/downloads` | |
| `/features` | **301** → `/modules` | |
| `/how-it-works` | **301** → `/platform` | |
| `/demo`, `/demos` | **301** → `/contact?intent=demo` | |

Related hosts HEAD/GET: `admin.lumenxtech.in`, `careers.lumenxtech.in`, `admissions.lumenxtech.in` → **200**.  
`downloads.lumenxtech.in` → **NXDOMAIN**.  
`lumenx-downloads.official-lumenx.workers.dev` APK/EXE → **200**.

### 1.4 Exact rollback procedure (Worker stays in place) — VERIFIED commands; dashboard confirm still needed

**Do not run during readiness.** Documented for cutover window only.

1. Record the **pre-change** active version from:
   - `npx wrangler deployments status --name lumenx-website`  
   - Today that is `061059aa-462d-44e0-bb1b-01791258ab74` — **re-check immediately before any cutover**.
2. If a bad **Worker** deploy happens (still on `lumenx-website`):
   ```bash
   cd apps/website
   npx wrangler rollback 061059aa-462d-44e0-bb1b-01791258ab74 --name lumenx-website -m "rollback after failed change"
   ```
   Or omit the version ID to roll back to the previous deployment interactively (`wrangler rollback --name lumenx-website`).
3. Re-verify: `https://lumenxtech.in/` 200, `/pricing` 200, `/contact` 200, `GET /api/leads` 405, `/sitemap.xml` 200.
4. If cutover moved the **custom domain** from Worker → Pages: rollback is **detach Pages custom domain and re-attach to Worker `lumenx-website`** in the Cloudflare dashboard (CLI domain attach not verified in this session). Keep the Worker undeleted for 7–14 days.

### 1.5 What needs Cloudflare dashboard / account owner — BLOCKED / NOT VERIFIED

| Item | Status |
|------|--------|
| Confirm `lumenxtech.in` + `www` custom domains are attached to Worker `lumenx-website` (not Pages) | **NOT VERIFIED** |
| Zone ID / DNS record details for apex | **NOT VERIFIED** |
| Whether Workers Builds auto-deploys on which Git branch | **NOT VERIFIED** |
| Production lead secrets (`RESEND_API_KEY`, `WEB3FORMS_ACCESS_KEY`, `LEAD_EMAIL_FROM`) — CLI secret list was empty; delivery path unproven | **NOT VERIFIED** |
| Which uploaded version is “golden” beyond current status ID | Confirm in dashboard | **BLOCKED** for labeling |
| Analytics / Search Console ownership | **NOT VERIFIED** |

---

## 2. New Astro project (Play)

### 2.1 Production build — VERIFIED

| Check | Result |
|-------|--------|
| Command | `npm run build` → `astro build` |
| Output directory | **`dist/`** (static HTML; no `output: 'server'` / no Cloudflare adapter) |
| This session | `dist/index.html` present; **27** `index.html` files under `dist/` |
| Unit tests | `test:pricing` **27 passed**; `test:enquiry` **passed**; `test:downloads` **DOWNLOADS VERIFY PASS** |
| Pages Function | `functions/api/enquiry.js` (deployed only with Cloudflare Pages, **not** inside static `dist/`) |
| Local `.env` | **Absent** (defaults from `.env.example` / code) |

### 2.2 Routes present in `dist/` — VERIFIED

`/`, `/about`, `/blog`, `/contact`, `/downloads`, `/get-started`, `/login`, `/modules`, `/platform`, `/platform/{admin,admissions,careers,connect,nexus,transport}`, `/pricing`, `/privacy`, `/resources`, `/signin`, `/signup`, `/solutions/{administrators,drivers,institutions,parents,students,teachers}`, `/terms`

**Not present in `dist/`:** `/cookies`, `/data-request`, `/products`, `/products/*`, `/how-it-works`, `/features`, `/demo`, `/demos`, `/resources/help`, `/resources/faq`, `/resources/downloads`, `/solutions` (index), `/sitemap.xml`, `/sitemap-index.xml`, `/api/*`

### 2.3 Navigation / links — VERIFIED (code + build)

| Surface | Destinations |
|---------|----------------|
| Header `NAV` | `/platform`, solutions children, `/modules`, `/pricing`, `/downloads`, `/resources`; plus `/contact`, `/login`, `/contact?intent=demo` |
| Footer | privacy, terms, demo, get-started, platform; also ThemeWagon/Tailgrids attribution links (external) |
| Resources page | `/#faq`, `/pricing`, `/about`, `/contact`, `/downloads`, `/get-started`, `/privacy`, `/terms`, `/platform` — **no** `/resources/faq` or `/resources/help` |
| Login page | Explains institute-issued login; CTAs to `/contact` and `/get-started` only — **does not** deep-link `admin.lumenxtech.in` / Play Store (unlike live `login-apps.ts`) |
| Contact section | **`mailto:` GET form** to lead inbox — not `/api/enquiry` |
| Homepage enquiry | Client posts JSON to **`/api/enquiry`** (`enquiry-forms.js`) |

### 2.4 Forms / enquiry backend — VERIFIED (code + tests); delivery — NOT VERIFIED on any host

| Layer | Status |
|-------|--------|
| Frontend validation + honeypot | VERIFIED (`test:enquiry` passed; `src/utils/enquiry.js`) |
| Real backend integration | **Implemented as Pages Function** `functions/api/enquiry.js` (Resend and/or Web3Forms) |
| Static `astro preview` / CDN without Functions | Returns **503 `not_configured`** if no secrets — fails closed (code) |
| Secrets on a live Pages project | **NOT VERIFIED** (no Pages project deployed this session; no `.env`) |
| Contact page | **mailto only** — no server integration |

**Required Function env names (no values printed):** `LEAD_EMAIL_TO` (optional; defaults to inbox constant), `WEB3FORMS_ACCESS_KEY` and/or `RESEND_API_KEY`, `LEAD_EMAIL_FROM` (required if using Resend). Optional browser `PUBLIC_WEB3FORMS_ACCESS_KEY`.

### 2.5 Legal / SEO — VERIFIED gaps

| Asset | Status |
|-------|--------|
| `/privacy`, `/terms` | Present in dist |
| `/cookies`, `/data-request` | **Missing** |
| `public/robots.txt` → `dist/robots.txt` | Present; Allow `/`; comments say sitemap path `/sitemap-index.xml` |
| Sitemap file | **Missing** (`sitemap-index.xml` / `sitemap-0.xml` not in dist) |

### 2.6 Downloads — VERIFIED separately from marketing cutover

| Check | Result |
|-------|--------|
| Matrix platforms | VERIFIED by `test:downloads` |
| Default artifact host | `https://lumenx-downloads.official-lumenx.workers.dev` |
| All matrix HEAD checks | **200** (admin/connect/transport/careers/admissions/nexus APK; admin/nexus EXE; admin/careers/admissions web) |
| `downloads.lumenxtech.in` | **NXDOMAIN** — do not point marketing links there until DNS exists |
| Product apps / downloads Worker | **Out of scope** — must not be modified for marketing migration |

### 2.7 Required env vars for staging (names only)

**Build-time / public (optional overrides):**  
`PUBLIC_DOWNLOADS_HOST`, `PUBLIC_ADMIN_WEB_URL`, `PUBLIC_CAREERS_WEB_URL`, `PUBLIC_ADMISSIONS_WEB_URL`, `PUBLIC_*_APK_URL`, `PUBLIC_*_DESKTOP_URL`, `PUBLIC_*_PLAY_URL`, `PUBLIC_WEB3FORMS_ACCESS_KEY`

**Pages Function secrets (Production + Preview):**  
`WEB3FORMS_ACCESS_KEY` and/or `RESEND_API_KEY` + `LEAD_EMAIL_FROM`; optional `LEAD_EMAIL_TO`

---

## 3. Compatibility — old URL → new destination map

Rules: destinations exist in Play `dist/` or are explicit **404/410 / DECISION REQUIRED**. No invented pages.

| Old / live URL | Live today | Play destination | Decision |
|----------------|------------|------------------|----------|
| `/` | 200 | `/` | Map 1:1 |
| `/platform` | 200 | `/platform` | Map 1:1 |
| `/platform/admin` | 200 | `/platform/admin` | Map 1:1 |
| `/platform/connect` | 200 | `/platform/connect` | Map 1:1 |
| `/platform/transport` | 200 | `/platform/transport` | Map 1:1 |
| `/platform/admissions` | 200 | `/platform/admissions` | Map 1:1 |
| `/platform/careers` | 200 | `/platform/careers` | Map 1:1 |
| `/platform/nexus` | (product page on live via slug; not in `SITE_PATHS`) | `/platform/nexus` | Map 1:1 when used |
| `/solutions` | 200 | **no `/solutions/index`** | **DECISION REQUIRED** — add index page, or redirect to `/solutions/institutions`, or 404 |
| `/solutions?role=*` | 200 (query) | `/solutions/{slug}` paths only | **DECISION REQUIRED** — redirect map for known roles ↔ slugs |
| `/modules` | 200 | `/modules` | Map 1:1 |
| `/modules/{category}` | legacy → `/modules?section=` on Worker | no category routes in Play | **DECISION REQUIRED** — redirect all to `/modules` |
| `/pricing` | 200 | `/pricing` | Map 1:1 |
| `/resources` | 200 | `/resources` | Map 1:1 (content thinner) |
| `/resources/help` | 200 | missing | **DECISION REQUIRED** — redirect → `/resources` or `/#faq`, or 404 |
| `/resources/faq` | 200 | missing | **DECISION REQUIRED** — redirect → `/#faq` or `/resources`, or 404 |
| `/resources/downloads` | 200 | missing (Play uses `/downloads`) | **Redirect → `/downloads`** (explicit) |
| `/resources/blog`, `/resources/demo` | Worker redirects → `/resources` | missing | **Redirect → `/resources`** |
| `/about` | 200 | `/about` | Map 1:1 |
| `/contact` | 200 | `/contact` | Map 1:1 (behavior differs: mailto vs `/api/leads`) |
| `/get-started` | 200 | `/get-started` | Map 1:1 |
| `/login` | 200 | `/login` | Map 1:1 (outbound app links weaker on Play) |
| `/privacy` | 200 | `/privacy` | Map 1:1 |
| `/terms` | 200 | `/terms` | Map 1:1 |
| `/cookies` | 200 | missing | **DECISION REQUIRED** — port page or redirect → `/privacy` / 410 |
| `/data-request` | 200 | missing | **DECISION REQUIRED** — **must** port or keep (compliance); do not silent-404 without legal OK |
| `/products` | 301 → `/platform` | missing | **Redirect → `/platform`** |
| `/products/admin` | 301 → `/platform/admin` | missing | **Redirect → `/platform/admin`** |
| `/products/connect` | (Worker rule) | missing | **Redirect → `/platform/connect`** |
| `/products/transport` | (Worker rule) | missing | **Redirect → `/platform/transport`** |
| `/products/admissions` | (Worker rule) | missing | **Redirect → `/platform/admissions`** |
| `/products/careers` | (Worker rule) | missing | **Redirect → `/platform/careers`** |
| `/products/nexus` | 301 → `/about` | missing | **Redirect → `/about`** (matches live) **or** `/platform/nexus` if product page preferred — **DECISION REQUIRED** (live uses `/about`) |
| `/download`, `/downloads` | 301 → `/resources/downloads` | `/downloads` exists | **Serve `/downloads`; redirect `/download` → `/downloads`** |
| `/features` | 301 → `/modules` | missing | **Redirect → `/modules`** |
| `/how-it-works` | 301 → `/platform` | missing | **Redirect → `/platform`** |
| `/demo`, `/demos` | 301 → `/contact?intent=demo` | missing | **Redirect → `/contact?intent=demo`** |
| `/robots.txt` | 200 | present (different body) | Replace with production-ready robots + sitemap URL |
| `/sitemap.xml` | 200 | **missing** | **Must add** before cutover |
| `/api/leads` | POST API | **not in Play** | **DECISION REQUIRED** — retire with notice, or proxy/compat Function; clients posting here will break |
| `/api/enquiry` | N/A on live | Pages Function only | New path; not a live→Play map |
| `/blog`, `/signin`, `/signup` | not in live `SITE_PATHS` | present (stubs) | Keep off sitemap / noindex until real content — **DECISION REQUIRED** |

---

## 4. Staging readiness (Cloudflare Pages — separate project)

**Do not attach `lumenxtech.in` yet.**

### 4.1 Exact steps (not executed)

1. Create a **new** Cloudflare Pages project (suggested name: `lumenx-marketing-astro` — final name owner choice).
2. Connect a Git repo for Play **or** use Direct Upload of `dist/` + ensure `functions/` is included in the Pages project root (Wrangler Pages upload from Play root).
3. Build settings if Git-connected:
   - **Root directory:** Play project root  
   - **Build command:** `npm run build`  
   - **Build output directory:** `dist`  
   - **Node:** match local Node used for successful build (record in dashboard; not pinned in `package.json`)
4. Set **Preview** and **Production** environment variables / secrets (names in §2.7). Prefer Function secrets over `PUBLIC_WEB3FORMS_ACCESS_KEY`.
5. Deploy to the default `*.pages.dev` hostname only.
6. Run staging tests (§4.3).  
7. Only after approval: custom staging hostname (optional), then later apex cutover checklist (§5).

### 4.2 Safe form-delivery verification (no secret printing; no spam)

1. On staging, `POST /api/enquiry` with **invalid** JSON → expect **400** (proves Function routing).
2. POST valid payload with **honeypot** field `companyWebsite` set → expect **200** `{ ok: true }` **without** inbox delivery (code short-circuits).
3. POST one **labeled** test payload (`description` starts with `STAGING-TEST-…`, type `question`) to a **dedicated** inbox or Web3Forms test destination configured only on Preview — confirm receipt once, then stop.
4. POST with secrets removed on a throwaway preview → expect **503** `not_configured` (proves fail-closed).
5. Never log or paste `WEB3FORMS_ACCESS_KEY` / `RESEND_API_KEY` / `LEAD_EMAIL_FROM` into tickets or chat.

**Not run this session:** any live POST to production `/api/leads` or staging `/api/enquiry`.

### 4.3 Staging test list

| Test | Pass criteria |
|------|----------------|
| Home, platform, pricing, downloads, contact, login, legal | 200 |
| Pricing examples 300×10, 500×15, 900×10, annual | Match unit tests / UI |
| Downloads matrix | Each CTA URL HEAD 200 (workers.dev until CDN DNS) |
| Enquiry Function | §4.2 |
| Redirects | Every row marked Redirect in §3 returns expected Location |
| `robots.txt` + sitemap | 200; sitemap lists only intentional URLs |
| Login / product hosts | admin/careers/admissions still 200; no marketing host pointed at product Workers |
| Mobile + desktop smoke | Nav + forms usable |

### 4.4 Downloads hostname (separate from Pages)

| Host | Status | Action |
|------|--------|--------|
| `lumenx-downloads.official-lumenx.workers.dev` | VERIFIED 200 artifacts | Keep as current artifact origin |
| `downloads.lumenxtech.in` | VERIFIED NXDOMAIN | DNS + Worker route is a **separate** project (`lumenx-downloads`); do not block marketing staging; do not claim CDN ready |

---

## 5. Approval checklist

### 5.1 Status marks

| Item | Mark | Evidence / gap |
|------|------|----------------|
| Worker name + wrangler config | **VERIFIED** | `wrangler.jsonc` |
| Current deployment version ID | **VERIFIED** | `061059aa-462d-44e0-bb1b-01791258ab74` via `deployments status` |
| Rollback CLI procedure | **VERIFIED** | `wrangler rollback` help + IDs above |
| Custom domain attached to Worker | **NOT VERIFIED** | Needs dashboard screenshot / owner confirm |
| Production lead secrets healthy | **NOT VERIFIED** | `secret list` empty; no POST test |
| Astro `npm run build` → `dist/` | **VERIFIED** | this session |
| Play route inventory | **VERIFIED** | dist listing |
| Play unit tests (pricing/enquiry/downloads) | **VERIFIED** | all passed |
| Enquiry real delivery on a host | **NOT VERIFIED** | needs Pages + secrets + §4.2 |
| URL compatibility map complete | **VERIFIED** as map; several rows **DECISION REQUIRED** | §3 |
| Redirects implemented in Play | **BLOCKED** | not implemented yet |
| Sitemap on Play | **BLOCKED** | missing |
| `/cookies` + `/data-request` | **BLOCKED** | missing; legal decision |
| `/api/leads` compatibility | **BLOCKED** | decision required |
| Pages staging project exists | **NOT VERIFIED** / **BLOCKED** | not created (by design this session) |
| `downloads.lumenxtech.in` DNS | **VERIFIED** gap (NXDOMAIN) | separate from marketing |
| Product Workers untouched | **VERIFIED** intent | no changes made |
| Play under Git | **BLOCKED** | no `.git` (audit) |

### 5.2 Evidence needed from Cloudflare dashboard / owner

1. Screenshot or export: custom domains for `lumenxtech.in` / `www` → Worker `lumenx-website`.  
2. Workers Builds: repo, branch, whether production auto-deploys.  
3. Confirmation whether Resend/Web3Forms keys exist anywhere for the live Worker (dashboard Secrets UI), given CLI list was empty.  
4. Written decisions for every **DECISION REQUIRED** row in §3 (especially `/data-request`, `/cookies`, `/api/leads`, `/products/nexus` target).  
5. Approval to create Pages staging project name and who owns secrets.  
6. Re-confirm active Worker version ID on cutover day.

### 5.3 Ordered pre-deployment checklist (staging Pages — before apex)

1. Put Play in Git; tag a release candidate.  
2. Implement §3 redirects + missing legal pages (or signed 410 decisions).  
3. Generate `sitemap.xml` / `sitemap-index.xml`; update `robots.txt` for staging host.  
4. Align login outbound links with live app hosts where appropriate.  
5. Create Pages project; set Preview secrets; deploy to `*.pages.dev` only.  
6. Run §4.2–4.3; record evidence (status codes, screenshot of one staging test email subject).  
7. Freeze accidental monorepo `lumenx-website` deploys if Workers Builds is branch-linked (**confirm dashboard**).  
8. Stakeholder sign-off on staging URL.

### 5.4 Cutover / rollback checklist (apex — only after §5.3)

**Cutover (ordered):**

1. Re-read `wrangler deployments status`; write down active version ID.  
2. Lower DNS TTL in advance (dashboard).  
3. Ensure Pages **Production** secrets match Preview.  
4. Attach `lumenxtech.in` / `www` to Pages **or** swap DNS per CF Pages custom-domain flow — **owner-executed**.  
5. Smoke: `/`, `/pricing`, `/downloads`, `/contact`, enquiry POST (one labeled), redirects, sitemap.  
6. Confirm product subdomains still on their Workers.  
7. Keep Worker `lumenx-website` **undeleted** 7–14 days.

**Rollback (ordered):**

1. Re-attach apex/www to Worker `lumenx-website` (dashboard).  
2. If needed: `npx wrangler rollback <recorded-version-id> --name lumenx-website -m "cutover rollback"`.  
3. Verify `/`, `/pricing`, `/contact`, `GET /api/leads` → 405, `/sitemap.xml` 200.  
4. Freeze further DNS changes; RCA before retry.

---

## 6. Explicit non-actions this session

- No production deploy  
- No DNS / custom domain / Worker route changes  
- No secret values printed  
- No deletion or replacement of `lumenx-website` or downloads/product Workers  
- No unwanted lead emails sent to production inbox  

---

## 7. Remaining blockers (summary)

1. **BLOCKED:** Play missing legal/SEO/compat routes and redirects (`/cookies`, `/data-request`, `/products/*`, sitemap, several `/resources/*`).  
2. **BLOCKED:** No Cloudflare Pages staging project / enquiry secrets yet.  
3. **BLOCKED:** Play not in Git.  
4. **NOT VERIFIED:** Dashboard domain binding; production lead-delivery health.  
5. **VERIFIED gap:** `downloads.lumenxtech.in` NXDOMAIN (separate track).  
6. **DECISION REQUIRED:** `/api/leads` retirement vs compatibility; `/products/nexus` and `/solutions` index behavior.

*End of readiness report. Safe to stage on a new Pages project after blockers 1–3 are addressed; not safe to cut over `lumenxtech.in` yet.*
