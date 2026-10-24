# LumenX Website — Play UI Fidelity Audit & Correction Report

**Date:** 2026-10-24  
**Stack preserved:** React 19 + TanStack Start + Cloudflare Workers (`apps/website`)  
**Play reference (inspected):** `qa-artifacts/_play-ref` (ThemeWagon/TailGrids Play clone) + [play-tailwind.tailgrids.com](https://play-tailwind.tailgrids.com/)  
**Production:** https://lumenxtech.in/  
**Deploy:** **not run** (per request)  
**Branch:** existing `fix/cloudflare-workers-build-upload` (uncommitted website work preserved; no force-push)

---

## Phase A — Routes audited

| Path | Role |
|------|------|
| `/` | Homepage |
| `/platform`, `/platform/$slug` | Platform overview + Admin, Connect, Transport, Admissions, Careers (+ Nexus where linked) |
| `/solutions`, `/solutions/$slug` | Solutions by role |
| `/modules`, `/modules/$category` | Modules catalogue |
| `/pricing` | Pricing + calculator |
| `/resources`, `/resources/downloads`, `/resources/faq`, `/resources/help`, `/resources/blog`, `/resources/demo` | Resources |
| `/login`, `/contact`, `/get-started`, `/about` | Conversion |
| `/privacy`, `/terms`, `/cookies`, `/data-request` | Legal |
| `/products`, `/products/$slug`, `/download(s)`, `/demo(s)`, `/features`, `/how-it-works` | Aliases / legacy |

---

## Phase B — Defect inventory (shared root causes)

Reference values from Play `src/input.css` / `index.html`: primary `#3758f9`, body `#637381`, stroke `#dfe4ea`, container `px-4`, section heads ~`mb-12` / `lg:mb-[70px]`, feature cards white + soft shadow, CTAs `rounded-md` / ~14px vertical padding.

| # | Area | Defect | Correction | Shared? |
|---|------|--------|------------|---------|
| 1 | Borders | `--border-brand` ~38% made every card hover a bright blue outline | Softened border tokens; hover uses `--border-strong` | Yes — tokens |
| 2 | SiteCard | Tailwind `p-5 rounded-xl shadow-sm border` fought `.site-card` CSS | SiteCard uses only `site-card` modifiers | Yes |
| 3 | Product cards | Heavy accent borders + wash on quiet FeatureCards | Neutral border; quiet removes wash blob | Yes |
| 4 | FeatureCard | Ad-hoc `px-4 py-3` + plain title | `site-feature-card` + `site-card-title` | Yes |
| 5 | ProductCard / header | Mixed shadcn Button vs `site-btn`; menu `lg:hidden` lost to `.site-btn { display }` | SiteButton + `.site-header-menu-trigger` media hide | Yes |
| 6 | Section | `mb-5`/`mb-10` not tokenized; dense only set top pad | `--site-section-head-gap*`; dense pad-block | Yes |
| 7 | Container | Wide max-width only via raw class | `Container wide` → `--site-wide` | Yes |
| 8 | Product hero | Stacked `.site-section` + Tailwind padding | Product-hero padding from CSS only | Yes |
| 9 | Typography | Play hero title vs `--site-text-hero` fork; kicker tracking 0.14 vs 0.16 | Unified hero size + `--site-kicker-tracking` | Yes |
| 10 | Downloads | Shadcn primary Button; platform chips double-boxed | CTAButton + quieter platform chips | Yes |
| 11 | Admin hero (prior) | DeviceFamily thin bar + detached companions | Laptop-only hero; natural screenshot ratio | Prior pass |
| 12 | Pricing copy (prior) | Homepage vs policy mismatch | Aligned to `@lumenx/utils` policy | Prior pass |

Play live HTML was compared structurally (hero / features / pricing / FAQ / footer patterns). **Pixel-perfect parity is not claimed** — LumenX keeps navy brand hero, product accents, and real product screenshots.

---

## Phase C — Shared system updates

### Tokens (`theme/tokens.css`, `theme/tokens.ts`)

- Softer `--border` / `--border-strong` / `--border-brand`
- Gutter closer to Play `16px` base: `clamp(1rem, 4vw, 1.5rem)`
- Section Y slightly tightened; `--site-section-head-gap`, `--site-wide`, `--site-kicker-tracking`
- Typed exports: `SITE_LAYOUT`, `SITE_TYPE`, section head gaps

### Components

- `SiteCard`, `FeatureCard`, `ProductCard`, `Container`, `Section`, `SiteHeader`, `DownloadProduct`, `ProductHero`, `ProductPreview` (prior laptop fix retained)

### CSS (`styles.css`)

- Card / product-card hover restrained
- Feature card + download platform hierarchy
- Play hero title → `var(--site-text-hero)`
- Product hero / capability / laptop hero rules retained from Admin fix

---

## Phases D–F — Pages affected

Shared-token/card/button fixes apply site-wide without per-page redesigns.

Explicit page-level work this pass + prior Admin polish:

| Surface | Status |
|---------|--------|
| Homepage hero / pricing / FAQ / showcase | Shared polish; pricing policy copy already aligned |
| Product heroes (Admin+) | Laptop-dominant Admin; other products inherit preview/card tokens |
| Downloads | Quieter cards, unified CTAs, preserved matrix/URLs |
| Solutions / Modules / Pricing / Login / Contact / About / Legal | Inherit shared system; overflow-checked |

**Not changed:** pricing calculator logic, login destinations, download artifact URLs, CF Workers config, routes, SEO helpers.

---

## Phase G — Visual regression

Tooling: Playwright via system Chrome (`channel: 'chrome'`) — bundled Chromium install timed out earlier.

### Primary matrix (36 shots)

Routes: `/`, `/platform`, `/platform/admin|connect|transport`, `/solutions`, `/modules`, `/pricing`, `/resources/downloads`, `/login`, `/contact`, `/about`  
Viewports: **390**, **768**, **1440**  
Result: **0 failures** (HTTP OK, no horizontal overflow, no collapsed laptop)

Artifacts: `qa-artifacts/website-visual-qa/play-fidelity/*__{mobile,tablet,desktop}.png` + `summary.json`

### Extra widths

360 / 430 / 1024 / 1280 / 1920 on home, downloads, pricing, admin — **no overflow**

### Extra routes (desktop)

`/platform/admissions`, `/platform/careers`, `/get-started`, `/privacy`, `/resources/faq`, `/resources` — OK

### Interactions spot-checked

- Book a Demo → `/contact?intent=demo`
- Downloads product tabs + CTA buttons present
- Mobile nav control uses `site-btn` + `lg:hidden`
- Admin preview tabs / laptop mockup remain intact (prior pass)

### Play comparison note

Homepage navy full-bleed hero + dual CTAs matches Play’s marketing hero structure (dark band, kicker, large title, checklist, dual actions). Downloads is a LumenX-specific surface (no Play twin); styled toward Play card/CTA language without inventing store listings.

---

## Phase H — Checks

| Check | Result |
|-------|--------|
| `npm run typecheck --workspace=@lumenx/app-website` | **pass** |
| `npm run build --workspace=@lumenx/app-website` | **pass** |
| Lint | not run as blocking gate this pass |
| Unit/e2e suite | not expanded; visual QA script used |
| Deploy | **not run** |

---

## Pricing / content

Homepage + FAQ remain aligned with `@lumenx/utils/subscription/policy`:

- ₹12 / student default; typical 12–15 band  
- ₹8,000 monthly minimum (higher of students×rate **or** minimum)  
- 60-day trial after approval  
- Yearly = **2 months free** (not a second 60-day free)

No invented testimonials, stats, or fake download URLs.

---

## Remaining limitations

1. **Not deployed** — production still serves previous Worker build until deploy.  
2. HTML hydration warning on `<html>` motion/text-size attrs — pre-existing.  
3. Side-by-side product heroes from `lg` (1024); 768 stacks (intentional).  
4. Admin still has hero preview + full Preview section + Look gallery — content structure unchanged.  
5. Nexus may remain lightly exposed depending on nav filters — not force-promoted.  
6. Full pixel-diff vs every Play HTML section not automated; fidelity is pattern-based + screenshot review.  
7. Playwright Chromium download may still fail offline; use `channel: 'chrome'` or retry install.  
8. Unrelated non-website dirty files on the branch (admin/admissions/careers/backend) were **not** modified for this UI pass.

---

## Deployment readiness

- Production build succeeds; Worker packaging via existing `prepare-cf-worker-deploy` path.  
- Rollback: redeploy previous Worker version / prior git SHA of `apps/website`.  
- Recommended next step (manual):  
  `npm run deploy --workspace=@lumenx/app-website`  
  then hard-refresh key routes and re-run `node scripts/website-visual-qa.mjs https://lumenxtech.in`

---

## Files touched (this site-wide pass)

- `apps/website/src/theme/tokens.css`, `tokens.ts`
- `apps/website/src/styles.css`
- `apps/website/src/components/SiteCard.tsx`, `SiteHeader.tsx`
- `apps/website/src/components/layout/Container.tsx`, `Section.tsx`
- `apps/website/src/components/content/FeatureCard.tsx`, `ProductCard.tsx`
- `apps/website/src/components/conversion/DownloadProduct.tsx`
- `apps/website/src/components/product/ProductHero.tsx` (+ prior Preview/Laptop work)
- `docs/website-play-ui-qa-report.md`
