# LumenX Astro — Cloudflare Pages Staging Plan

**Date:** 2026-10-26  
**Status:** PLAN ONLY — **no** Pages project created, **no** deploy, **no** DNS, **no** dependency upgrades  
**Repo:** https://github.com/officiallumenx/lumenx-marketing-astro (verified **PRIVATE**)

Upstream: `docs/lumenx-pre-push-security-review.md`, `docs/lumenx-staging-preparation.md`.

---

## 1. Verified repository state

| Item | Verified value |
|------|----------------|
| Visibility | PRIVATE |
| Default / production branch for Pages | **`master`** |
| Latest commit on `master` | `f0499a2e4a493165bddf99bfe230419344b9f740` — *Document verified private GitHub push results.* |
| Prior initial commit | `faded226baeacb8971345f9e199e6f923988f377` — *Initial LumenX marketing website* |
| Local HEAD = `origin/master` | Yes |
| Build command | `npm run build` (runs `prebuild` → `scripts/generate-sitemap.mjs`, then `astro build`) |
| Output directory | **`dist`** |
| Functions | `functions/api/enquiry.js`, `functions/api/leads.js` (Pages Functions at project root `functions/`) |
| Redirects | `public/_redirects` (copied into `dist` on build) |
| Local Node used for successful builds | **v24.16.0** / npm **11.13.0** (record in Pages; prefer an LTS Node if CF build image differs — verify first build log) |
| Installed | Astro **3.6.4**, Swiper **11.0.4**, `@astrojs/tailwind` ^5, Tailwind **3.3.3** |

Rendering model: **static** Astro (no `output: 'server'`, no `@astrojs/cloudflare` adapter). Enquiry/leads run only as **Cloudflare Pages Functions**.

---

## 2. Critical dependency findings and remediation plan (no upgrades yet)

### 2.1 Astro `3.6.4` (direct, npm severity: critical)

**Path:** `node_modules/astro` (effects also listed on `@astrojs/markdown-remark`, `@astrojs/tailwind`).

**npm aggregated fix:** Astro **7.4.2** (semver **major**). Many individual GHSA items are fixed earlier (4.x–6.x ranges); audit still rolls the package up to “critical” until a modern release.

| Advisory (sample of high/critical relevance) | Severity | Typical applicability to **this** static site |
|----------------------------------------------|----------|-----------------------------------------------|
| [GHSA-26w7-cxv4-gfx2](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) AVIF image optimization RCE | critical | Low if image optimization / AVIF pipeline unused (static marketing assets) — confirm no Astro image endpoint in build |
| [GHSA-wrwg-2hg8-v723](https://github.com/advisories/GHSA-wrwg-2hg8-v723) server islands XSS | high | Low — not using server islands / SSR adapter |
| [GHSA-8hv8-536x-4wqp](https://github.com/advisories/GHSA-8hv8-536x-4wqp) slot XSS | high | Build/render-time; review if user-controlled slot names exist (marketing content is static) |
| [GHSA-2pvr-wf23-7pc7](https://github.com/advisories/GHSA-2pvr-wf23-7pc7) Host header SSRF on prerendered error fetch | high | Primarily SSR/dev-server class; static `dist/` on Pages reduces exposure |
| [GHSA-x3h8-62x9-952g](https://github.com/advisories/GHSA-x3h8-62x9-952g) Dev server local file read | low | **Dev only** — not production Pages |
| Middleware / CSRF / `_image` / `X-Forwarded-Host` family | moderate–high | Mostly SSR, middleware, or Cloudflare **adapter** features we are **not** using |

**Residual risk if staging as-is:** CI/`npm install` supply chain + any accidental future enablement of SSR/image endpoints. Static HTML on `*.pages.dev` is a **reduced** attack surface vs Astro SSR.

### 2.2 Swiper `11.0.4` (direct, npm severity: critical)

| Item | Detail |
|------|--------|
| Advisory | [GHSA-hmx5-qpq5-p643](https://github.com/advisories/GHSA-hmx5-qpq5-p643) — Prototype pollution |
| Affected range | `>=6.5.1 <12.1.2` (npm suggests fix **14.3.0**) |
| Path | `node_modules/swiper` |
| Code usage | `src/scripts/testimonial.js` imports Swiper; `Testimonials.astro` uses Swiper markup |
| Page wiring | **Not imported** by `Layout.astro` or current `src/pages/*` (homepage removed testimonials). Layout only retains unused `.swiper-button-*` CSS rules |

**Residual risk if staging as-is:** Package remains installable; dead code could be wired later. Unlikely in active client bundles today if tree-shaken / never imported by pages.

### 2.3 Proposed remediation options (awaiting your choice — **do not execute yet**)

| Option | Action | Effort | Staging impact |
|--------|--------|--------|----------------|
| **A — Stage first (recommended for Pages staging)** | Deploy static site to Pages **without** dependency upgrades; accept documented residual risk for private `*.pages.dev` | None | Unblocks staging smoke tests now |
| **B — Remove unused Swiper (quick win)** | Delete/stop shipping `Testimonials.astro` + `testimonial.js`; remove `swiper` from `package.json`; `npm install`; re-audit | Low | Clears **critical Swiper** without Astro major |
| **C — Astro stepwise upgrade** | Upgrade Astro → **4.x** (or 5.x) with matching `@astrojs/tailwind` / Tailwind compatibility matrix; full `npm test` + visual QA; then re-audit | Medium–high | Best long-term; **do after** or **in parallel with** staging, not as a silent force |
| **D — Jump to Astro 7.4.2** | Matches npm’s “fixed” version; largest break risk (integrations, Tailwind plugin, build) | High | Only with dedicated upgrade PR + approval |

**Recommendation:** Use **Option A** to create staging infrastructure and smoke-test. Approve **Option B** as a small follow-up PR before any apex cutover. Plan **Option C** as a separate upgrade track; avoid **D** until C is understood.

---

## 3. Cloudflare Pages setup checklist (manual — not executed)

Suggested **Pages project name:** `lumenx-marketing-astro` (must be unique in the Cloudflare account).

### 3.1 Create project (Git-connected)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.  
2. Authorize GitHub; select **`officiallumenx/lumenx-marketing-astro`**.  
3. Confirm repository is **private** and you intend only staging hostnames first.

### 3.2 Build settings

| Setting | Value |
|---------|--------|
| Production branch | **`master`** |
| Root directory | `/` (repo root) |
| Framework preset | None / Astro (if offered; settings below override) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Functions** | Automatic from repo `functions/` (do not set output to a path that drops Functions) |
| Node version | Prefer **20** or **22** LTS if offered; if build fails on CF’s default, set `NODE_VERSION=20` (or match local **24** only if CF image supports it) via environment variable / `.nvmrc` later |

### 3.3 Domains

| Domain | Action for staging |
|--------|--------------------|
| Default `*.pages.dev` | Use this for all smoke tests |
| Custom staging host (optional) | e.g. `staging.…` only if you create it later — **not** `lumenxtech.in` |
| `lumenxtech.in` / `www` | **Do not attach** |

### 3.4 Environment variables — **names only** (no values)

Set under Pages → Settings → Environment variables. Prefer **Preview** first for staging secrets; add Production later when ready.

#### Required for form delivery (Preview)

Provide **at least one** delivery path:

| Name | When required | Notes |
|------|---------------|--------|
| `WEB3FORMS_ACCESS_KEY` | If using Web3Forms | Secret — Pages encrypted env |
| `RESEND_API_KEY` | If using Resend | Secret |
| `LEAD_EMAIL_FROM` | Required **if** using Resend | e.g. verified sender identity in Resend |
| `LEAD_EMAIL_TO` | Optional | Defaults in code to `lumenxtech.official@gmail.com` |

Without any provider key: `POST /api/enquiry` and `POST /api/leads` return **HTTP 503** with `code: "not_configured"` (fail-closed; no fake success).

#### Optional public build-time overrides (`PUBLIC_*`)

Only if you need to override defaults already in `src/data/downloads.js` / `.env.example`:

- `PUBLIC_DOWNLOADS_HOST`
- `PUBLIC_ADMIN_WEB_URL`, `PUBLIC_CAREERS_WEB_URL`, `PUBLIC_ADMISSIONS_WEB_URL`
- `PUBLIC_ADMIN_APK_URL`, `PUBLIC_CONNECT_APK_URL`, `PUBLIC_TRANSPORT_APK_URL`, `PUBLIC_CAREERS_APK_URL`, `PUBLIC_ADMISSIONS_APK_URL`, `PUBLIC_NEXUS_APK_URL`
- `PUBLIC_ADMIN_DESKTOP_URL`, `PUBLIC_NEXUS_DESKTOP_URL`
- `PUBLIC_*_PLAY_URL` (optional store listings)
- `PUBLIC_WEB3FORMS_ACCESS_KEY` — **avoid**; prefer Function secret `WEB3FORMS_ACCESS_KEY`

Do **not** invent additional secret names beyond those referenced in `.env.example` and `functions/api/*.js`.

### 3.5 Deploy trigger

- Auto-deploy on push to `master` (Pages default), **or** pause Production deploys and use Preview deployments from PRs — owner preference.  
- First deploy: expect build log success + `*.pages.dev` URL.

---

## 4. Staging-only delivery secrets and safe verification

### Configure (dashboard)

1. Create a **dedicated** Web3Forms access key **or** Resend API key used only for staging (not shared with production Worker if avoidable).  
2. Add secrets to Pages **Preview** environment only at first.  
3. Never commit values; never paste full keys into chat/tickets.

### Verify without leaking secrets

| Step | Expectation | Safe? |
|------|-------------|-------|
| `POST /api/enquiry` with invalid JSON | **400** | Yes |
| Valid body + honeypot field `companyWebsite` set | **200** `{ ok: true }` — **no** inbox mail | Yes |
| Valid body **without** secrets configured | **503** `not_configured` | Yes |
| One labeled real submit (`description` / message starts with `STAGING-TEST-…`) with Preview secrets | **200** + one email to staging inbox | Yes — **one** message, then stop |
| Confirm response JSON never includes API keys | Inspect response body | Yes |

Same matrix for `POST /api/leads` with legacy payload (`intent`, `name`, `email`, `message`, optional `company_website` honeypot).

Mailto fallback on `/contact` and `/data-request` UI remains for users when delivery fails.

---

## 5. Staging smoke-test checklist

Base URL = Pages `https://<project>.pages.dev` (record exact URL after create).

### Routes (expect 200 unless noted)
- [ ] `/`, `/pricing`, `/platform`, `/platform/admin`, `/platform/connect`, `/platform/transport`, `/platform/admissions`, `/platform/careers`, `/platform/nexus`
- [ ] `/solutions`, `/solutions/institutions` (and other role pages)
- [ ] `/modules`, `/downloads`, `/resources`, `/resources/faq`, `/resources/help`
- [ ] `/about`, `/contact`, `/get-started`, `/login`
- [ ] `/privacy`, `/terms`, `/cookies`, `/data-request` — last updated **4 September 2026**

### Redirects (301)
- [ ] `/products` → `/platform`
- [ ] `/products/admin` → `/platform/admin`
- [ ] `/products/nexus` → `/about`
- [ ] `/download` → `/downloads`
- [ ] `/resources/downloads` → `/downloads`
- [ ] `/features` → `/modules`
- [ ] `/how-it-works` → `/platform`
- [ ] `/demo` / `/demos` → `/contact?intent=demo`

### Pricing
- [ ] Calculator examples: 300×₹10 → ₹8,000; 500×₹15 → ₹8,000; 900×₹10 → ₹9,000; annual pay-10-for-12

### Enquiry / leads
- [ ] Run §4 verification matrix on `/api/enquiry` and `/api/leads`
- [ ] Confirm Functions appear in Pages deployment (not “static only”)

### Downloads
- [ ] Matrix links HEAD **200** on workers.dev artifacts (and product web hosts)
- [ ] No change to downloads Worker / product apps

### SEO
- [ ] `/robots.txt` present
- [ ] `/sitemap.xml` present; excludes `/blog`, `/signin`, `/signup`
- [ ] **Note:** sitemap locs currently use `https://lumenxtech.in` — acceptable for content parity; optional staging-only sitemap later

### Mobile / layout
- [ ] Home, pricing, platform, contact usable at ~390px and desktop width
- [ ] Header / footer legal links work

### Isolation
- [ ] `lumenxtech.in` still served by existing Worker
- [ ] `admin` / `careers` / `admissions` hosts untouched

---

## 6. Blockers and gates

### Before creating Pages staging (infrastructure approval)
| Item | Status |
|------|--------|
| Private GitHub repo + `master` | **Ready** |
| Build/output/Functions known | **Ready** |
| Your approval to create Cloudflare Pages project | **Required** |
| Cloudflare account access + GitHub OAuth for Pages | **Required (manual)** |
| Dependency upgrades | **Not required** for private staging if Option A accepted |

### Before treating staging as “forms ready”
| Item | Status |
|------|--------|
| Preview delivery secrets configured | **Required** |
| One successful `STAGING-TEST-…` delivery | **Required** |
| 503 path verified when secrets absent (optional regression) | Recommended |

### Before any **public** / apex cutover (`lumenxtech.in`)
| Item | Status |
|------|--------|
| Full smoke checklist green on staging | Required |
| Decide Swiper removal (Option B) and/or Astro upgrade track (C) | Strongly recommended |
| Redirects + legal + enquiry parity signed off | Required |
| Explicit approval to attach custom domain | Required |
| Keep `lumenx-website` Worker for rollback | Required |

**Not blockers for private `*.pages.dev` staging:** `downloads.lumenxtech.in` NXDOMAIN; remaining npm audit highs on transitive build tools; sitemap canonical host still production domain.

---

## 7. Manual steps awaiting your approval

1. **Approve** staging Option **A** (stage without upgrades) or require **B**/**C** first.  
2. In Cloudflare: create Pages project → connect `officiallumenx/lumenx-marketing-astro` → settings in §3.  
3. Set Preview secrets (names in §3.4).  
4. Run smoke checklist §5; record Pages URL + build ID.  
5. Do **not** attach `lumenxtech.in` until a separate cutover approval.

---

## 8. Explicit non-actions this document / session

- No Cloudflare resource create/modify  
- No deploy  
- No DNS / custom domain  
- No production secret changes  
- No `lumenx-website` Worker or product/downloads Worker changes  
- No dependency upgrades  

---

*Await approval before any infrastructure changes.*
