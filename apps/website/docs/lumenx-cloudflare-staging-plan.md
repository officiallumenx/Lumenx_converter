# LumenX Astro — Cloudflare Pages Staging Plan

**Date:** 2026-10-26  
**Repo:** https://github.com/officiallumenx/lumenx-marketing-astro (**PRIVATE**)  
**Status:** Upgrade **merged to `master`**. Pages staging **not created** (no authenticated Cloudflare API in this session). Apex cutover **not started**.

---

## Phase A — Merge results (executed)

| Item | Value |
|------|--------|
| Upgrade tip merged | `dc1444a0892f1249a3e556afdd6b27f861813b1a` (includes `69f764a` Astro 7.4.2) |
| Merge commit | **`b6aa1ffd2bb8e55d7487d385a81c69ac831cb0d1`** — *Merge security/astro-upgrade: Astro 7.4.2 security upgrade.* |
| Diff vs prior `master` | Reviewed upgrade files only (no secrets / `dist` / `.env`) |
| Astro | **7.4.2** |
| Output | Static **`dist/`** (34 pages) |
| Functions | `functions/api/enquiry.js`, `functions/api/leads.js` present |
| `npm test` | **EXIT 0** |
| `npm run build` | **EXIT 0** |
| `npm audit` | **critical 0**; `astro`/`sharp` cleared; **8** remaining (1 moderate, 7 high) via `astro-compress` toolchain — see `docs/lumenx-astro-upgrade-plan.md` |

Live Worker **`lumenx-website`** / `lumenxtech.in` / product apps / downloads: **unchanged**.

---

## Remaining audit (impact)

Build-time only through `astro-compress` (`svgo`, `deepmerge-ts`, globs, PostCSS parser). Not Astro SSR runtime. Acceptable for private `*.pages.dev` staging; optional later: replace/drop compress. **Site is not vulnerability-free.**

---

## Phase B — Pages staging (manual — not executed here)

No Cloudflare CLI/MCP auth available → **create in dashboard**:

1. Workers & Pages → Create → Pages → Connect Git → `officiallumenx/lumenx-marketing-astro`  
2. Project name e.g. `lumenx-marketing-astro`  
3. Production branch **`master`** · Build **`npm run build`** · Output **`dist`** · root `/`  
4. Optional: `NODE_VERSION=22`  
5. **Do not** add custom domain / `lumenxtech.in`  
6. Deploy → record `https://<project>.pages.dev` + commit SHA (expect ≥ `b6aa1ff`)  
7. Settings → Env vars → **Production** (required for `master`):  
   - `WEB3FORMS_ACCESS_KEY` **or** (`RESEND_API_KEY` + `LEAD_EMAIL_FROM`)  
   - `LEAD_EMAIL_TO` optional (defaults in code)  
   - Skip `PUBLIC_*` unless overriding downloads defaults  
8. Redeploy after secrets. Never put secrets on the existing Worker for this step.

| Staging field | Status |
|---------------|--------|
| Pages project created | **No** (await dashboard) |
| Staging URL | **Not assigned** |
| Secrets configured | **Not configured** |
| Form delivery verified | **No** |

---

## Phase C — Smoke checklist (run on `*.pages.dev` after create)

- [ ] Routes: `/`, `/pricing`, `/platform/*`, `/solutions`, `/modules`, `/downloads`, `/resources/*`, `/about`, `/contact`, legal  
- [ ] Redirect: **`/products/nexus` → `/about`** (+ other `_redirects`)  
- [ ] Pricing calculator mins  
- [ ] `/api/enquiry` + `/api/leads`: 400 / honeypot 200 no-mail / 503 `not_configured` / 429 / one `STAGING-TEST-<id>` **inbox confirmed**  
- [ ] Downloads HEAD 200; robots + sitemap; mobile/desktop; no broken assets  
- [ ] Confirm `lumenxtech.in` still Worker  

---

## Blockers before “forms-ready staging”

1. Create Pages project + record URL  
2. Production env secrets on **this** project only  
3. Confirmed `STAGING-TEST-…` delivery  

## Blockers before apex cutover (`lumenxtech.in`)

1. Full smoke green on staging  
2. Explicit cutover approval  
3. Keep `lumenx-website` for rollback  

---

## Rollback (if Pages exists / after bad cutover)

1. **Staging only:** delete/disable Pages project or pause deploys — apex untouched.  
2. **If domain moved to Pages:** detach custom domain from Pages; re-attach to Worker `lumenx-website`; verify `https://lumenxtech.in`.  
3. **Git:** `master` pre-merge tip was `21cbaf9` (plan-only); upgrade merge is `b6aa1ff`. Revert merge only with explicit approval.

## Final cutover checklist (do **not** run yet)

1. Staging smoke + form delivery signed off  
2. Snapshot current Worker deployment ID  
3. Attach `lumenxtech.in` (+ www) to Pages **or** approved DNS change  
4. Verify apex routes, redirects, `/api/leads`, downloads links  
5. Watch 24–48h; Worker retained undeleted  

---

## Explicit non-actions this session

| Action | Done? |
|--------|-------|
| Merge + push upgrade to `master` | **Yes** (after this doc commit) |
| Cloudflare Pages create / deploy | **No** |
| DNS / `lumenxtech.in` | **No** |
| Worker / product / downloads changes | **No** |
| Claim forms work on Pages | **No** |

*Stop: wait for Pages create (manual) + your review before apex cutover.*
