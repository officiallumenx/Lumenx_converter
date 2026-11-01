# LumenX Astro — Security Upgrade Plan

**Date:** 2026-10-26  
**Status:** Plan on `master`; **implementation complete on local branch** `security/astro-upgrade` — **not pushed**; **no** Cloudflare create/deploy  

**Project:** Play Astro (`officiallumenx/lumenx-marketing-astro`)  
**Related:** `docs/lumenx-cloudflare-staging-plan.md`

**Honesty:** Clearing the Astro critical audit aggregation requires a modern Astro. After upgrade, **do not** claim the app is vulnerability-free (transitive deps remain).

Official guides used: [Upgrade to v4](https://docs.astro.build/en/guides/upgrade-to/v4/) · [v5](https://docs.astro.build/en/guides/upgrade-to/v5/) · [v6](https://docs.astro.build/en/guides/upgrade-to/v6/) · [v7](https://docs.astro.build/en/guides/upgrade-to/v7/) · [GHSA-26w7-cxv4-gfx2](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) (fixed **≥7.2.8**).

---

## 1. Baseline (rollback)

| Package | Baseline on `master` |
|---------|----------------------|
| `astro` | **3.6.4** (`^3.6.4`) |
| `@astrojs/tailwind` | **5.0.2** (`^5.0.0`) |
| `tailwindcss` | **3.3.3** |
| `astro-compress` | **2.2.3** (`^2.0.15`) |
| Node (local) | **v24.16.0** |

Preserve `package-lock.json` from the pre-upgrade `master` commit as the rollback baseline. Restore via checkout of that commit’s lockfile + `package.json` then `npm ci`.

**Stack facts:** static default (no adapter); `npm run build` → `dist/`; Pages Functions in `functions/`; legacy content collection `src/content/config.js` (`type: 'content'`) + blog `getCollection` / `entry.slug` / `entry.render()`; Tailwind via `@astrojs/tailwind` (no hand-written `@tailwind` CSS entry yet).

---

## 2. Target and staged path (corrected)

### Ultimate target

| Target | Evidence |
|--------|----------|
| **`astro@≥7.4.2`** (prefer exact **7.4.2** or newer patch) | npm audit `fixAvailable`; includes AVIF fix (**≥7.2.8**); Node **≥22.23.4** for 7.4.2 |

### Tailwind strategy (corrected — avoid redesign)

| Stage | Tailwind approach |
|-------|-------------------|
| Astro **3–5** | Keep **Tailwind 3** + `@astrojs/tailwind` (peer supports Astro ^3 \|\| ^4 \|\| ^5). Bump `@astrojs/tailwind` to a 5.1+/6.x release that peers Astro 5 when on S2. |
| Astro **6–7** | **`@astrojs/tailwind` is deprecated and does not peer Astro 6/7.** Prefer **keep Tailwind 3** via Vite **PostCSS** (`tailwindcss` + `autoprefixer`) + a small `src/styles/tailwind.css` with `@tailwind` directives — **not** a Tailwind v4 redesign. Tailwind v4 + `@tailwindcss/vite` remains an optional future track. |

### Stages

| Stage | Astro | Other | Notes |
|-------|-------|-------|-------|
| **S1** | Latest **4.16.x** | Keep TW3 + `@astrojs/tailwind` 5.x | Vite 5; low risk |
| **S2** | Latest **5.x** | TW3 + compatible `@astrojs/tailwind`; **migrate content collections** to Content Layer (or temporary `legacy.collections` only within S2) | Last stop with official TW integration |
| **S3** | Latest **6.x** | Remove `@astrojs/tailwind`; TW3 via PostCSS; `astro-compress` **≥2.4.0**; Node **≥22.12** | Vite 7; legacy collections flag **gone** — Content Layer required |
| **S4** | **≥7.4.2** | Keep TW3 PostCSS; sharp **≥0.35.4** (overrides if needed); Node **≥22.23.4**; optional `compressHTML: true` if whitespace regresses | Vite 8; Rust compiler; clears AVIF critical |

**Branch name:** `security/astro-upgrade` (not `upgrade/astro-security`).

**Cloudflare:** Remain **static** `dist/` + existing `functions/`. Do **not** add `@astrojs/cloudflare` adapter for this marketing site.

---

## 3. Content collections (Astro 5+ — official steps)

From the [v5 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v5/):

1. Move `src/content/config.js` → **`src/content.config.js`** (or `.ts`) at project `src/` root (not inside `src/content/`).  
2. Replace `type: 'content'` with `loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' })` from `astro/loaders`.  
3. Replace `entry.slug` with **`entry.id`** in `getStaticPaths` / links.  
4. Replace `await entry.render()` with `import { render } from 'astro:content'` → `await render(entry)`.  
5. Astro 5 interim only: `legacy: { collections: true }` if blocked — **must** migrate before Astro 6 (auto-legacy removed; v6 temporary flag differs and is not the long-term path).

---

## 4. Breaking changes relevant here

| Transition | This project |
|------------|--------------|
| 3→4 | Low — no Astro endpoints; no `Astro.request.params` found |
| 4→5 | **Content Layer** (blog); `Astro.glob` deprecate if any |
| 5→6 | Node 22.12+; TW integration removal; collections must be Content Layer; `astro-compress` ≥2.4.0 |
| 6→7 | Node 22.23.4+; Rust HTML strictness; `compressHTML` default `'jsx'`; Markdown Sätteri |

Pages Functions (`/api/enquiry`, `/api/leads`) are **outside** the Astro major upgrade surface but must keep importing `src/utils/*` after build toolchain changes.

---

## 5. AVIF RCE

Affected when Astro/sharp optimizes **untrusted AVIF**. This site does not use `astro:assets`/`/_image`. Residual risk: **`astro-compress` sharp** during build on repo images. Precaution: upgrade to **≥7.2.8**, review image PRs, optional disable Compress Image until patched.

---

## 6. Implementation checklist

1. Commit this plan to `master`.  
2. Branch `security/astro-upgrade` from updated `master`.  
3. Record baseline versions in the branch (this doc + commit SHA).  
4. Execute S1→S4 with `npm test` + `npm run build` + `npm audit` after each stage.  
5. Stop at a safe checkpoint if a stage fails; do not force unsafe fixes.  
6. **Do not push** the implementation branch until owner review.  
7. **Do not merge** to `master` or create Cloudflare resources without approval.

### Commands per stage

```bash
npm test
npm run build
npm audit
```

### Smoke (local / dist)

Routes, `_redirects` (incl. `/products/nexus` → `/about`), pricing tests, legal pages, enquiry/leads unit tests (`not_configured`, honeypot), downloads verify, sitemap, robots.txt.

---

## 7. Rollback

1. Discard or reset `security/astro-upgrade`.  
2. On `master`: restore baseline `package.json` + `package-lock.json` from pre-upgrade commit; `npm ci`.  
3. Never roll back via Worker/DNS changes.

---

## 8. Implementation results (2026-10-26)

| Field | Value |
|-------|--------|
| Plan commit on `master` | **`21cbaf92db10c34f8ffa94ccecf7238a81bfe81a`** — *Document Astro security upgrade plan.* |
| Branch | `security/astro-upgrade` (local only) |
| Rollback baseline | Astro **3.6.4**, `@astrojs/tailwind` **5.0.2**, Tailwind **3.3.3**, `astro-compress` **2.2.3** at `21cbaf9` |
| Final packages | `astro@7.4.2`, `tailwindcss@^3.3.3` (PostCSS), `astro-compress@2.4.3`, `sharp@0.35.5`, `autoprefixer`, `postcss` |
| Removed | `@astrojs/tailwind` |
| Stages completed | **S1** 4.16.19 → **S2** 5.18.2 + Content Layer → **S3** 6.4.8 + TW3 PostCSS → **S4** 7.4.2 |
| `npm test` | **EXIT 0** (pricing, enquiry, leads, downloads, routes) |
| `npm run build` | **EXIT 0** — **34** pages; static `dist/`; `_redirects` / robots / sitemap present |
| Functions preserved | `functions/api/enquiry.js`, `functions/api/leads.js` unchanged |
| `npm audit` | **critical: 0**; **`astro` ABSENT**; **`sharp` ABSENT** (re-run 2026-10-26 before push) |
| Remaining audit | **8** findings (1 moderate, 7 high) — table below; **not** vulnerability-free |
| Key code changes | `src/content.config.js` (Content Layer); blog `id`/`render()`; `src/styles/tailwind.css`; `astro.config.mjs` PostCSS + `compressHTML: true`; sharp overrides |
| Branch pushed? | **Yes** — `origin/security/astro-upgrade` @ **`69f764ab8cbaa3045e285621aa7d079f57fee8de`** |
| Merged to `master`? | **No** |
| PR created? | **No** |
| Cloudflare / DNS / Worker | **No** |

### Pre-push verification (executed)

| Check | Result |
|-------|--------|
| Branch | `security/astro-upgrade` |
| HEAD | `69f764ab8cbaa3045e285621aa7d079f57fee8de` |
| Diff vs `master` | 10 files only (no `.env`, secrets, screenshots, `dist/`, `node_modules`) |
| `npm test` | **EXIT 0** |
| `npm run build` | **EXIT 0** (34 pages) |
| `npm audit` | critical **0**; total **8** (1 moderate, 7 high) |

### Remaining vulnerabilities (npm audit — production relevance)

All remaining items are **build-time / toolchain** paths through **`astro-compress`** (or its deps). They do **not** ship as Astro SSR runtime. Static `dist/` HTML/CSS/JS is what Pages serves; Functions are separate. Residual risk is mainly **CI/build agent** and SVG minify tooling.

| Package | Severity | Path | Advisory (sample) | Production relevance |
|---------|----------|------|-------------------|----------------------|
| `astro-compress` | high | **direct** → pulls vulnerable children | Aggregator | Build-only integration |
| `@playform/pipe` | high | `astro-compress` → `@playform/pipe` | via `deepmerge-ts` | Build-only |
| `deepmerge-ts` `<8` | high | `astro-compress` → `@playform/pipe` → `deepmerge-ts` | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) stack exhaustion | Build-only config merge |
| `svgo` `4.0.0–4.0.2` | high | `astro-compress` → `svgo` | [GHSA-w27v-7q3p-w38r](https://github.com/advisories/GHSA-w27v-7q3p-w38r) script sanitization | Build-time SVG minify of **first-party** assets |
| `brace-expansion` `≤1.1.20` | high | transitive (glob stack) | ReDoS / expansion DoS GHSAs | Build-time globbing |
| `minimatch` `≤3.1.3` | high | transitive | ReDoS GHSAs | Build-time globs |
| `picomatch` `≤2.3.1` | high | transitive | ReDoS / matching GHSAs | Build-time globs |
| `postcss-selector-parser` `<6.1.5` | moderate | Tailwind/PostCSS chain | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) CPU exhaustion | **Build-time** CSS processing |

Optional follow-up (separate approval): drop or replace `astro-compress`, or wait for upstream bumps — `npm audit fix --force` would **downgrade** compress (rejected).

### Push verification

| Item | Value |
|------|--------|
| Remote branch | https://github.com/officiallumenx/lumenx-marketing-astro/tree/security/astro-upgrade |
| Compare to master | https://github.com/officiallumenx/lumenx-marketing-astro/compare/master...security/astro-upgrade |
| Remote tip (upgrade commit) | **`69f764ab8cbaa3045e285621aa7d079f57fee8de`** (`git ls-remote` matched) |
| Force-push | **No** |
| Repo visibility | **PRIVATE** |

### Files changed on upgrade commit (summary)

- `package.json`, `package-lock.json`
- `astro.config.mjs`
- `src/content.config.js` (from `src/content/config.js`)
- `src/styles/tailwind.css` (added)
- `src/layouts/Layout.astro`
- `src/pages/blog/[slug].astro`
- `src/components/Blogsection.astro`, `RelatedArticles.astro`
- `docs/lumenx-astro-upgrade-plan.md` (results; this push-report amend is a follow-up doc commit if present)

---

*Upgrade branch pushed for review. Do not merge, deploy, or create Pages without explicit approval.*
