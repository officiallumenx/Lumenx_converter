# LumenX Two-Website Discovery & Production Migration Audit

**Audit date:** 2026-10-26  
**Scope:** Read-only discovery. No production deploy, DNS, domain, or secret changes.  
**Evidence classes:** VERIFIED · PARTIALLY VERIFIED · UNVERIFIED · NOT FOUND

---

## 1. Executive summary

| Item | Finding | Confidence |
|------|---------|------------|
| Live marketing site | `https://lumenxtech.in` responds via **Cloudflare** (`server: cloudflare`, `cf-ray` present) | **VERIFIED** (HTTP headers) |
| Live app identity | Cloudflare Worker name **`lumenx-website`** in monorepo Wrangler config; docs describe Workers Builds for this Worker | **PARTIALLY VERIFIED** (local config + docs; dashboard custom-domain attachment not inspected live) |
| Live source repo | Monorepo workspace → GitHub `officiallumenx/Lumenx_converter` · app `@lumenx/app-website` | **VERIFIED** |
| Live stack | React 19 + TanStack Start/Router + Vite 7 + Nitro Cloudflare module Worker + Tailwind 4 | **VERIFIED** (`apps/website/package.json`, `vite.config.ts`, `wrangler.jsonc`) |
| New replacement candidate | Standalone Astro 3.6 Play template (this Play Astro project root) | **VERIFIED** |
| New stack | Astro static (`output` default) + Tailwind 3 + `astro-compress`; optional CF Pages Function for enquiries | **VERIFIED** |
| Play Git | **No `.git` directory** — not a Git repo | **VERIFIED** |
| Safe cutover recommendation | Deploy Astro to a **new Cloudflare Pages project**, preview on a staging hostname, then migrate `lumenxtech.in` only after checklist pass | **Recommended (A)** |
| Migration status | **Not started** — audit only | — |

**Do not cut over yet.** Preserve separate product Workers (`admin`, `connect`, etc.), downloads host, and `/api/leads` behavior until forms and SEO parity are proven on staging.

---

## 2. Which project is which

| Role | Absolute path | Repo / remote | App package |
|------|---------------|---------------|-------------|
| **Current live marketing website (old)** | Monorepo workspace root | `https://github.com/officiallumenx/Lumenx_converter.git` (`origin` / `lumenx_converter`) | `apps/website` → `@lumenx/app-website` |
| **New Play Astro website (replacement candidate)** | Play Astro project root | **NOT FOUND** at audit time (no git remotes; Git initialized later during staging prep) | `play-astro` |

**Branch (old monorepo, at audit time):** `fix/cloudflare-workers-build-upload` tracking `origin/fix/cloudflare-workers-build-upload` — **VERIFIED**. Dirty tree with untracked `qa-artifacts/*` and `apps/admin-desktop/dist-out/` — **VERIFIED**.

**Related but not the marketing site:** Monorepo also contains Admin/Connect/Transport/Careers/Admissions/Nexus apps and `apps/downloads-host` (Worker `lumenx-downloads`). These are **separate** hosts/subdomains and must not be overwritten by a marketing cutover.

---

## 3. Verified architecture of the old website

| # | Topic | Finding | Source | Confidence |
|---|--------|---------|--------|------------|
| 1 | Framework | React `^19.2.7`, TanStack Start `^1.167.50`, TanStack Router `^1.168.25`, Vite `^7.3.1`, Tailwind `^4.2.1` | `apps/website/package.json` | VERIFIED |
| 2 | Entry | Worker `fetch` in `apps/website/src/server.ts`; TanStack Start via `vite.config.ts` `tanstackStart.server.entry: "server"` | same | VERIFIED |
| 3 | Rendering | **SSR hybrid** — Cloudflare Worker + static assets (`ASSETS` binding → `dist/client`) | `wrangler.jsonc`, `server.ts` | VERIFIED |
| 4 | Build / output | `vite build && node ../../scripts/prepare-cf-worker-deploy.mjs` → `dist/server/server.js`, `dist/client/` | `package.json` scripts | VERIFIED |
| 5 | Package manager | npm workspaces + root lockfile in monorepo | repo root | VERIFIED |
| 6 | Routing | File routes under `apps/website/src/routes/*`; generated `routeTree.gen.ts` | routes folder | VERIFIED |
| 7 | Backend on same Worker | `POST /api/leads` via `handleLeadApiRequest` | `src/lib/lead-api.ts`, `server.ts` | VERIFIED |
| 8 | Auth on marketing site | Login **hub / outbound links** only (not product auth). Product OTP lives on app Workers | `routes/login.tsx`, `lib/login-apps.ts` | VERIFIED (pattern) |
| 9 | DB/storage | Marketing Worker: **no D1/KV/R2 bindings** in `wrangler.jsonc`. Downloads use separate Worker + planned R2 | `wrangler.jsonc`, `apps/downloads-host` | VERIFIED / PARTIALLY |
| 10 | Env (names only) | See §11 | `.env.production`, wrangler `vars` | VERIFIED names |
| 11 | Assets | Built into `dist/client`; product screenshots in app content | build output | VERIFIED |
| 12 | Forms | Contact / get-started → Web3Forms and/or `/api/leads` (Resend / Web3Forms / FormSubmit) | `leads.ts`, `lead-mail.ts` | VERIFIED (code) |
| 13 | SEO | `robots.txt`, `sitemap.xml` served from Worker; live 200 | `server.ts`, live GET | VERIFIED |
| 14 | Scripts | `dev`, `build`, `deploy` (`wrangler deploy --config dist/server/wrangler.json`), `cf:upload`, `typecheck` | `package.json` | VERIFIED |
| 15 | Limitations | Relies on CF Workers Builds dashboard; preview vs production secrets UNVERIFIED without dashboard | docs | PARTIALLY |

Worker config excerpt (names only):

- Worker **name:** `lumenx-website` (`apps/website/wrangler.jsonc` → `"name"`)
- `compatibility_date`: `2025-09-24`
- `vars`: `LEAD_EMAIL_TO`, `LEAD_FORMSUBMIT`
- Assets binding: `ASSETS` → `dist/client`

---

## 4. Verified architecture of the new website (Play Astro)

| # | Topic | Finding | Source | Confidence |
|---|--------|---------|--------|------------|
| 1 | Framework | Astro `^3.6.4`, `@astrojs/tailwind` `^5.0.0`, Tailwind `^3.3.3`, Prata font | `package.json` | VERIFIED |
| 2 | Entry | File-based pages in `src/pages/` + `src/layouts/Layout.astro` | tree | VERIFIED |
| 3 | Rendering | **Static** default (no `output: 'server'` / no Astro Cloudflare adapter in `astro.config.mjs`) | `astro.config.mjs` | VERIFIED |
| 4 | Build / output | `astro build` → `dist/` static HTML | `package.json`, prior builds (28 pages) | VERIFIED |
| 5 | Lockfile | `package-lock.json` (npm) | root | VERIFIED |
| 6 | Routing | Astro pages: home, platform, solutions, modules, pricing, downloads, contact, login, legal, resources, blog stubs, 404 | `src/pages/**` | VERIFIED |
| 7 | Backend | Optional CF Pages Function `functions/api/enquiry.js` (not active under `astro preview`) | `functions/api/enquiry.js` | VERIFIED (code) |
| 8 | Auth | Login page explains institute-issued credentials; no session | `src/pages/login.astro` | VERIFIED |
| 9 | DB | None | — | VERIFIED |
| 10 | Env | `PUBLIC_*` download URLs; Function secrets `WEB3FORMS_ACCESS_KEY` / `RESEND_API_KEY` / `LEAD_EMAIL_*` | `.env.example` | VERIFIED names |
| 11 | Assets | `public/assets/**` screenshots, logos | public tree | VERIFIED |
| 12 | Forms | Homepage `#enquiry` (question / demo / custom_application) + contact mailto fallback | `Enquirysection.astro`, `Contactsection.astro` | VERIFIED |
| 13 | SEO | Meta in Layout; `public/robots.txt` present; **no** first-class sitemap generator found | Layout, public | PARTIALLY |
| 14 | Scripts | `dev`, `build`, `preview`, `test:pricing`, `test:enquiry`, `test:downloads` | `package.json` | VERIFIED |
| 15 | Limitations | No Git; no Wrangler for the static site itself; enquiry E2E needs Pages secrets or FormSubmit activation; Luma Studio font optional/disabled | audit | VERIFIED |

**No `wrangler.toml` / Pages project config in Play** — NOT FOUND for domain attachment.

---

## 5. Current production hosting and domain configuration

### Live HTTP evidence (VERIFIED)

| Check | Result |
|-------|--------|
| `GET https://lumenxtech.in/` | 200 · `server: cloudflare` · `cf-ray` present |
| Marketing routes sampled | 200 for home, pricing, downloads, contact, platform, products, solutions, modules, about, privacy, terms, cookies, data-request, how-it-works, features, demos, resources, login, get-started |
| `GET /api/leads` | **405** (method not allowed — consistent with POST-only API) |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 (~3 KB) |

### Configuration evidence (PARTIALLY VERIFIED)

| Claim | Evidence | Confidence |
|-------|----------|------------|
| Served by Cloudflare **Worker** `lumenx-website` | `wrangler.jsonc` `"name": "lumenx-website"`; docs `docs/cloudflare-workers-builds.md`, `docs/website/01-discovery-architecture.md` | PARTIALLY VERIFIED — matches intended architecture; **dashboard custom domain binding not inspected in this session** |
| Not Cloudflare Pages (for current marketing) | Worker+assets pattern, not Pages `functions/` layout for website app | PARTIALLY VERIFIED |
| Workers Builds deploy | Documented dashboard settings (root `apps/website`, build `npm run build`, upload via wrangler) | PARTIALLY VERIFIED (docs) |
| Account / project IDs | — | **UNVERIFIED / NOT FOUND** in safe local files |
| Production vs preview env | Secrets for Resend/Web3Forms | **UNVERIFIED** without dashboard |

### Related production hosts (VERIFIED HTTP 200 for origins during prior/session probes)

| Host | Role |
|------|------|
| `admin.lumenxtech.in` | Admin web |
| `connect.lumenxtech.in` | Connect web |
| `transport.lumenxtech.in` | Transport web |
| `careers.lumenxtech.in` | Careers web |
| `admissions.lumenxtech.in` | Admissions web |
| `nexus.lumenxtech.in` | Nexus web |
| `downloads.lumenxtech.in` | **DNS does not resolve** (prior VERIFIED fail) |
| `lumenx-downloads.official-lumenx.workers.dev` | Downloads Worker (APK/EXE 200) |

**Must remain untouched by marketing cutover:** product Workers, downloads Worker, Railway/backend if any, auth OTP flows.

### Dashboard information still needed (UNVERIFIED)

1. Confirm `lumenxtech.in` + `www` custom domains attached to Worker `lumenx-website` (vs Pages).
2. Cloudflare account ID / zone ID (names only for runbooks).
3. Whether Workers Builds auto-deploys on `main` push.
4. Production secret presence: `RESEND_API_KEY`, `WEB3FORMS_ACCESS_KEY`, `LEAD_EMAIL_FROM`.
5. Current Worker version ID for rollback.

---

## 6. Complete route inventory

### Live old website (`lumenxtech.in`) — VERIFIED HTTP where noted

| Path | Purpose | Live | Backend deps | In Play Astro? | Cutover action |
|------|---------|------|--------------|----------------|----------------|
| `/` | Homepage | 200 | — | Yes | Migrate / replace |
| `/pricing` | Calculator | 200 | shared pricing utils | Yes | Migrate (verify copy parity) |
| `/downloads`, `/download` | Download center | 200 | env artifact URLs | Yes `/downloads` | Migrate; keep `/download` redirect |
| `/contact` | Lead form | 200 | `/api/leads` / Web3Forms | Yes (mailto + enquiry) | Migrate carefully |
| `/get-started` | Onboarding | 200 | leads | Yes | Migrate |
| `/login` | Login hub | 200 | outbound app URLs | Yes | Preserve destinations |
| `/platform`, `/platform/$slug` | Products | 200 | — | Yes | Migrate |
| `/products`, `/products/$slug` | Alias of platform | 200 | redirects | **No dedicated `/products`** | Redirect → `/platform` |
| `/solutions`, `/solutions?role=` | Role solutions | 200 | — | Yes `/solutions/[slug]` | Align query vs path |
| `/modules`, `/modules/$category` | Modules | 200 | — | Partial `/modules` | Migrate / expand |
| `/about` | About | 200 | — | Yes | Migrate |
| `/privacy`, `/terms`, `/cookies` | Legal | 200 | `@lumenx/legal` | privacy/terms only | Add cookies or redirect |
| `/data-request` | DPDP / deletion | 200 | form? | **MISSING** in Play | **Preserve or migrate** |
| `/how-it-works` | Narrative | 200 | — | Partial (ecosystem) | Redirect or port |
| `/features` | Features | 200 | — | Partial homepage Features | Redirect `/modules` or port |
| `/demos`, `/demo` | Demo CTAs | 200 → contact-like | — | Via enquiry/demo | Redirect |
| `/resources/*` | Help/FAQ/blog/downloads | 200 | — | Thin `/resources` | Expand or redirect |
| `/api/leads` | Lead API | 405 GET | Worker handler | Play uses `/api/enquiry` (Pages) | **Conflict risk** if Worker replaced blindly |
| `/robots.txt`, `/sitemap.xml` | SEO | 200 | Worker | robots yes; sitemap weak | Must ship SEO on cutover |
| `/platform/nexus` | Nexus product | (assumed via slug) | — | Yes | Migrate |

### Play Astro routes (static) — VERIFIED from `src/pages`

| Path | Purpose | Notes |
|------|---------|-------|
| `/` | Home + calculator + enquiry | |
| `/platform`, `/platform/[slug]` | Six products | |
| `/solutions/[slug]` | Role pages | |
| `/modules` | Modules index | |
| `/pricing` | Calculator | |
| `/downloads` | Matrix | |
| `/contact`, `/get-started`, `/login` | Conversion | |
| `/about`, `/privacy`, `/terms` | Legal | |
| `/resources` | Link list | |
| `/blog`, `/signin`, `/signup` | Thin / stub | Avoid claiming full CMS |
| `/404` | Not found | |

### URL conflicts if Astro replaced the Worker naively

| Conflict | Risk |
|----------|------|
| Loss of `/api/leads` | Breaks old contact clients posting to that path |
| Missing `/data-request`, `/cookies`, `/products/*`, `/how-it-works` | SEO/legal breakage unless redirects |
| `/api/enquiry` only on Pages Functions | Not available if hosting is static-only CDN without Functions |
| Product subdomains | **No conflict** if left on existing Workers |

---

## 7. Feature-by-feature comparison

| Feature | Existing website status | New website status | Required action | Risk | Verification method |
|---------|-------------------------|--------------------|-----------------|------|---------------------|
| Marketing homepage | VERIFIED WORKING (live 200) | IMPLEMENTED BUT UNTESTED at prod | Replace after staging QA | Med | Live + local preview |
| Product pages (Admin…Nexus) | VERIFIED WORKING | IMPLEMENTED (Play product system) | Migrate | Med | Route probes + screenshots |
| Pricing calculator + ₹8k floor | VERIFIED WORKING (live page; utils selftest in monorepo) | VERIFIED WORKING (27 unit tests) | Keep Play formula; do not regress | High | `npm run test:pricing` + UI |
| Custom rate ≥ ₹10 | PARTIALLY VERIFIED (live title still mentions “from ₹12”) | VERIFIED WORKING | Align messaging | Med | UI + live copy check |
| Downloads matrix | VERIFIED WORKING (live 200) | VERIFIED WORKING (HEAD probes) | Migrate; prefer CDN host when DNS live | Med | `test:downloads` |
| Contact / leads | VERIFIED WORKING (code + live API 405 on GET) | PARTIALLY — enquiry needs Pages secrets | Wire delivery before cutover | **High** | POST test on staging |
| Triple enquiry forms | MISSING as dedicated homepage trio | IMPLEMENTED | Keep | Med | Local form validation tests |
| Login hub | VERIFIED WORKING | IMPLEMENTED | Preserve outbound URLs | High | Compare `login-apps` vs Play login |
| Legal (privacy/terms) | VERIFIED WORKING | IMPLEMENTED | Migrate | Med | Content review |
| Cookies / data-request | VERIFIED WORKING | MISSING | Port or redirect | High (compliance) | Legal review |
| SEO sitemap/robots | VERIFIED WORKING | PARTIAL (robots only) | Add sitemap on Astro | Med | Fetch staging |
| Ecosystem 3D orbit | N/A / different UI | IMPLEMENTED | Optional keep | Low | Visual QA |
| Analytics | UNKNOWN | UNKNOWN | Confirm before cutover | Med | Dashboard |
| Auth OTP / app sessions | Separate app Workers — VERIFIED as separate | Not in scope | **Do not touch** | Critical | Leave hosts |

---

## 8. Download and release-host audit

| Item | Status | Confidence |
|------|--------|------------|
| Approved matrix (Admin web/android/windows; Connect/Transport android; Careers/Admissions web/android; Nexus android/windows **no web**) | Implemented in Play `src/data/downloads.js` | VERIFIED |
| Artifact host `downloads.lumenxtech.in` | DNS missing | VERIFIED (prior fail) |
| Worker `lumenx-downloads` / `*.workers.dev` APK+EXE | HTTP 200 for all matrix artifacts in `test:downloads` | VERIFIED |
| Old site filters workers.dev for **web** origins | `marketingWebUrl()` | VERIFIED |
| Play currently links APK/EXE to workers.dev defaults | `.env.example` / downloads.js | VERIFIED — acceptable until CDN DNS |
| R2 bucket binding | Documented as required; not verified attached | UNVERIFIED |
| Play Store listings | Env optional; unset → APK | VERIFIED |

---

## 9. Form and backend audit

| Path | Old site | Play site | Confidence |
|------|----------|-----------|------------|
| Primary inbox | `lumenxtech.official@gmail.com` (`LEAD_EMAIL_TO` / `LEAD_INBOX_EMAIL`) | Same inbox constant | VERIFIED names |
| API | `POST /api/leads` on Worker | `POST /api/enquiry` Pages Function | VERIFIED code |
| Providers | Resend / Web3Forms / FormSubmit | Same pattern | VERIFIED code |
| Rate limit / honeypot | Yes (`lead-api.ts`) | Yes (`functions/api/enquiry.js`) | VERIFIED |
| Local static preview delivery | N/A (SSR Worker) | **Fails closed** without secrets (no fake success) | VERIFIED intent |
| Production delivery secrets | UNVERIFIED in dashboard | Must set on Pages | UNVERIFIED |

---

## 10. Pricing calculation audit

**Required rule (do not change during migration):**

`monthlyPayable = max(8000, studentCount × ratePerStudent)` with `rate ≥ 10`.

| Case | Expected monthly | Play unit test | Confidence |
|------|------------------|----------------|------------|
| 300 × ₹10 | ₹8,000 | Pass | VERIFIED |
| 500 × ₹15 | ₹8,000 | Pass | VERIFIED |
| 800 × ₹10 | ₹8,000 | Pass | VERIFIED |
| 900 × ₹10 | ₹9,000 | Pass | VERIFIED |
| 900 × ₹12 | ₹10,800 | Pass | VERIFIED |
| Annual | ×12 / −×2 / ×10 on **monthlyPayable** | Pass | VERIFIED |

Old monorepo: `packages/utils` subscription pricing selftest also encodes ₹8,000 floor — VERIFIED file exists. Live `/pricing` title still says “Monthly from ₹12…” — **PARTIALLY VERIFIED** messaging drift vs Play custom-rate story.

---

## 11. Environment-variable and service dependency inventory

### Names only (no values)

**Old website (`apps/website/.env.production` keys observed):**  
`VITE_SITE_ORIGIN`, `VITE_ADMIN_ORIGIN`, `VITE_CONNECT_ORIGIN`, `VITE_TRANSPORT_ORIGIN`, `VITE_NEXUS_ORIGIN`, `VITE_CAREERS_ORIGIN`, `VITE_ADMISSIONS_ORIGIN`, `VITE_ADMIN_APK_URL`, `VITE_NEXUS_APK_URL`, `VITE_CONNECT_APK_URL`, `VITE_TRANSPORT_APK_URL`, `VITE_ADMISSIONS_APK_URL`, `VITE_CAREERS_APK_URL`, `VITE_ADMIN_DESKTOP_URL`, `VITE_NEXUS_DESKTOP_URL`

**Also referenced in code (may be dashboard-only):**  
`VITE_WEB3FORMS_ACCESS_KEY`, `VITE_LEAD_ENDPOINT`, `VITE_*_PLAY_URL`, `VITE_*_VERSION`, Worker secrets `RESEND_API_KEY`, `LEAD_EMAIL_FROM`, `LEAD_EMAIL_TO`, `WEB3FORMS_ACCESS_KEY`, `LEAD_FORMSUBMIT`

**Play (`.env.example`):**  
`PUBLIC_DOWNLOADS_HOST`, `PUBLIC_*_WEB_URL`, `PUBLIC_*_APK_URL`, `PUBLIC_*_DESKTOP_URL`, `PUBLIC_*_PLAY_URL`, `PUBLIC_WEB3FORMS_ACCESS_KEY`, Function secrets `LEAD_EMAIL_TO`, `WEB3FORMS_ACCESS_KEY`, `RESEND_API_KEY`, `LEAD_EMAIL_FROM`

**External services:** Cloudflare (Workers/Pages/DNS), Web3Forms, Resend, FormSubmit, Google Fonts (old CSP), downloads Worker.

---

## 12. Build and test results (this audit session)

| Check | Project | Result | Confidence |
|-------|---------|--------|------------|
| `npm run test:pricing` | Play | **27 passed** | VERIFIED |
| `npm run test:enquiry` | Play | **passed** | VERIFIED |
| `npm run test:downloads` | Play | **DOWNLOADS VERIFY PASS** | VERIFIED |
| Prior `astro build` | Play | **28 pages** | VERIFIED (earlier this day) |
| Live route probe | Old | Major marketing routes **200** | VERIFIED |
| CI on push to `main` | Monorepo | Builds website; **no wrangler deploy step** in `ci.yml` | VERIFIED |
| Push current feature branch auto-deploys? | Monorepo | **Unlikely via GitHub Actions alone**; Workers Builds may still deploy if linked to branch — **UNVERIFIED** | — |

---

## 13. Git and deployment workflow

| Project | Git | Deploy trigger | Risk if you push |
|---------|-----|----------------|------------------|
| Play Astro | **No git** | None configured | Push N/A until repo created |
| Monorepo | GitHub `Lumenx_converter` | Manual `npm run deploy:website` / CF Workers Builds (documented) | Pushing to a branch connected to Workers Builds **could** publish — confirm dashboard before pushing website changes |

**Safety:** This audit did **not** commit, push, reset, or deploy.

---

## 14. Missing information and unresolved questions

1. Cloudflare dashboard confirmation that `lumenxtech.in` is bound to Worker `lumenx-website` (vs Pages).  
2. Whether `www` redirects are Worker logic only or DNS.  
3. Production lead-delivery secrets present and healthy.  
4. Analytics / Search Console property ownership.  
5. Exact Workers Builds Git branch (is production `main` or another?).  
6. Play project: create Git remote? Where should it live relative to monorepo?  
7. Legal requirement for `/data-request` and `/cookies` on day-1 cutover.  
8. Whether any third parties hardcode `/api/leads`.

---

## 15. Production migration risks

| Risk | Severity | Notes |
|------|----------|-------|
| Replacing Worker with static-only host drops `/api/leads` | High | Need Pages Functions or keep Worker BFF |
| Missing legal routes | High | Compliance / trust |
| SEO sitemap gap | Medium | Rankings |
| Download DNS still on workers.dev | Medium | Branding / trust; works technically |
| Accidental deploy of monorepo website while iterating | High | Confirm CF Builds branch |
| Overwriting product Workers | Critical | Never point apex at Admin Worker |
| Messaging drift (₹12 vs custom ≥₹10) | Medium | Align before go-live |
| Play not in Git | Medium | No rollback history for Astro alone |

---

## 16. Recommended migration architecture

### Options

| Option | Summary | Fit |
|--------|---------|-----|
| **A. New Cloudflare Pages project + later domain move** | Static `dist/` + `functions/api/enquiry.js` | **Best fit** for Astro static + enquiry Function |
| **B. New Cloudflare Worker for Astro** | Requires `@astrojs/cloudflare` adapter / SSR shift | Extra complexity; only if you need Worker-only hosting |
| **C. Fold Astro into existing `lumenx-website` Worker** | Rebuild Worker to serve Astro or reverse-proxy | Highest coupling risk; fights TanStack Start pipeline |

### Recommendation: **A**

**Why (verified needs):** Play is static Astro; enquiry backend is already authored as a **Pages Function**; old site is a **different** TanStack Worker — replacing it in-place (C) or forcing Astro into Worker SSR (B) adds risk without benefit.

**Prerequisites:** Create Pages project; set secrets; staging domain; redirect map; sitemap; legal pages; download CDN plan; freeze monorepo website deploys during cutover window.

---

## 17. Step-by-step future cutover plan (NOT executed)

1. Put Play under Git; tag release candidates.  
2. Create Cloudflare Pages project `lumenx-marketing-astro` (name TBD).  
3. Build `npm run build`; publish `dist/` + `functions/`.  
4. Attach **staging** hostname only; run full QA (pricing, downloads, forms POST, mobile).  
5. Add redirects for old-only paths (`/products/*` → `/platform/*`, `/data-request`, etc.).  
6. Confirm product subdomains unchanged.  
7. Lower DNS TTL ahead of time.  
8. Swap `lumenxtech.in` / `www` to Pages **after** approval.  
9. Keep old Worker undeleted for 7–14 days for instant rollback.  
10. Monitor 404s, form inbox, Search Console.

---

## 18. Rollback plan

1. Re-attach custom domains to Worker `lumenx-website` (previous version ID).  
2. Or restore prior Pages deployment if cutover was Pages-native.  
3. Verify `/`, `/pricing`, `/contact`, `/api/leads`.  
4. Announce freeze on further DNS changes until RCA done.

---

## 19. Go-live checklist

- [ ] Staging Pages URL approved by stakeholder  
- [ ] Pricing examples (300×10, 500×15, 900×10, annual) verified in browser  
- [ ] Downloads matrix + artifact HTTP 200  
- [ ] Enquiry POST delivers to inbox (not fake success)  
- [ ] `/api/leads` compatibility or documented retirement  
- [ ] Redirects for `/products`, `/data-request`, `/cookies`, `/how-it-works`, `/download`  
- [ ] `robots.txt` + `sitemap.xml` on staging  
- [ ] Login outbound URLs match production app hosts  
- [ ] Product Workers untouched  
- [ ] Rollback owner + Worker version ID recorded  
- [ ] Explicit written approval to migrate DNS  

---

## Appendix A — Live route probe log (2026-10-26)

All `https://lumenxtech.in{path}` unless noted:

`/` 200 · `/pricing` 200 · `/downloads` 200 · `/download` 200 · `/contact` 200 · `/get-started` 200 · `/login` 200 · `/platform` 200 · `/platform/admin` 200 · `/products` 200 · `/products/admin` 200 · `/solutions` 200 · `/modules` 200 · `/about` 200 · `/privacy` 200 · `/terms` 200 · `/cookies` 200 · `/data-request` 200 · `/how-it-works` 200 · `/features` 200 · `/demos` 200 · `/resources` 200 · `/resources/downloads` 200 · `/api/leads` **405** · `/robots.txt` 200 · `/sitemap.xml` 200

---

## Appendix B — Explicit non-actions this audit

- No production deploy  
- No DNS / domain attach or detach  
- No secret printing  
- No commits or pushes  
- No pricing logic changes during audit  
- No deletion of Workers or R2 data  

---

*End of audit. Migration awaits explicit approval.*
