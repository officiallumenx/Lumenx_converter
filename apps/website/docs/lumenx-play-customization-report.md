# LumenX Play Astro customization report

**Project:** Play Astro project root (this repository)  
**Date:** 2026-10-26  
**Approach:** Content and branding customization of ThemeWagon Play Astro while preserving Play layouts, typography, spacing, components, and responsive behavior.

## Summary

The standalone Play Astro template was customized into a LumenX marketing site. Demo SaaS copy, fake stats/testimonials/clients, and Play branding were replaced with verified LumenX product, pricing, and contact information. Authentic Admin/Connect/Transport/Admissions/Careers screenshots and ecosystem imagery were copied from the LumenX website assets. The React monorepo was not modified or overwritten. No deployment was performed.

## Pages and components customized

### Core / shared
- `src/data/lumenx.js` — products, capabilities, roles, pricing, FAQs, nav
- `src/layouts/Layout.astro` — LumenX metadata, OG tags, favicon, reduced-motion, removed MadeWithButton
- `src/components/layout/Header.astro` — Platform / Solutions / Modules / Pricing / Resources / Login / Book a Demo
- `src/components/layout/Footer.astro` — LumenX description, product/solution/company links, privacy/terms, license attribution retained
- `src/components/layout/Breadcrumb.astro` — LumenX descriptions (no Lorem Ipsum)
- `src/components/ContentPage.astro` — reusable inner-page shell

### Homepage sections
- `Hero.astro`, `Productssection.astro` (six equal Play-styled product cards), `Ecosystemsection.astro` (Admin hub + satellite relationships; not a flat collage)
- `Features.astro`, `Aboutsection.astro`, `CTAsection.astro`, `Pricingsection.astro`, `Rolessection.astro`, `Faq.astro`, `Contactsection.astro`
- `src/pages/index.astro` — LumenX homepage composition (removed Team / Testimonials / Clients / Blog / Made-with)

### Routes implemented
| Route | Status |
|-------|--------|
| `/` | Done |
| `/platform` | Done |
| `/platform/admin` | Done |
| `/platform/connect` | Done |
| `/platform/transport` | Done |
| `/platform/admissions` | Done |
| `/platform/careers` | Done |
| `/platform/nexus` | Done (copy only; no UI screenshot asset) |
| `/solutions/*` (6 roles) | Done |
| `/modules` | Done |
| `/pricing` | Done |
| `/resources` | Done |
| `/about` | Done |
| `/contact` | Done |
| `/get-started` | Done |
| `/login` | Done |
| `/privacy`, `/terms` | Done |
| `/signin` → `/login` | Redirect |
| `/signup` → `/get-started` | Redirect |
| `/blog` → `/resources` | Redirect (demo posts drafted) |

Nexus is restored in the six-product showcase and ecosystem section. No authentic Nexus UI screenshot exists in the asset set — the card uses a branded “screenshot pending” panel (not a fabricated interface). Documented in `MISSING_SCREENSHOTS` inside `src/data/lumenx.js`.

## Text and images replaced

- Play hero / features / about / pricing / FAQ / contact / CTA copy → LumenX verified messaging
- Fake “09 years” counter → “6 products in one ecosystem”
- Testimonials / Team / Clients / Blog removed from homepage
- Header/footer logos → LumenX SVG wordmarks (`lumenx-logo.svg` / `lumenx-logo-white.svg`) plus PNG assets on disk
- Hero / about imagery → ecosystem + Admin/Connect screenshots
- Contact / leads / approved privacy contact → `lumenxtech.official@gmail.com` (earlier drafts also cited `official.lumenx@gmail.com` as a privacy mailbox; current approved public privacy contact is `lumenxtech.official@gmail.com`)
- Pricing → students × custom rate (≥ ₹10); monthly payable = max(₹8,000, subtotal); billing 3 / 6 / 12 months (annual: pay 10 for 12); 60-day trial after verification

## New assets added

Under `public/`:
- `assets/logo/lumenx-logo.svg`, `lumenx-logo-white.svg`, `lumenx-logo.png`, `lumenx-mark.png`
- `assets/brand/lumenx-ecosystem.jpg`, `admin.png`
- `assets/hero/hero-image.jpg`
- `assets/about/about-image-01.jpg`, `about-image-02.jpg` (from product screenshots)
- `assets/screenshots/{admin,connect,transport,admissions,careers}/*` from `apps/website/public/screenshots`
- `favicon.svg`, `apple-touch-icon.png`
- `robots.txt` (no production canonical claimed)

## Pages still needing authentic LumenX screenshots

- **Nexus:** no UI screenshot in `public/assets/screenshots` (confirmed by upstream product-pages note “No product screenshots yet”). Showcase shows a branded pending state; `/platform/nexus` omits a fake UI image.
- **Product pages:** each uses one primary screenshot; deeper galleries (fees, attendance, boarding, etc.) exist under `public/assets/screenshots/*` but are not all wired into page layouts yet
- **Header logo:** SVG wordmark used for clarity on transparent/sticky header; replace with refined official SVG/PNG art direction if design requires pixel-perfect brand lockup
- **About secondary images:** currently Admin command + Connect home crops, not lifestyle photography

## Product showcase & ecosystem refinement (2026-10-26)

- Six cards with consistent `aspect-[16/10]` media, category label, name, body, and “View product →” link using Play `rounded-xl` / `shadow-1` / `shadow-testimonial`
- Screenshots: Admin `command.png`, Connect `home.jpg`, Transport `driver-home.jpg`, Admissions `institute-access.jpg`, Careers `home.jpg`
- Ecosystem section: Admin hub + five relationship cards + compact six-product strip (built with Play grid; not a flattened ecosystem JPEG)
- `npm run build` after change: **27 pages** (includes `/platform/nexus`)
- Responsive captures: `docs/screenshots/showcase-home-{390,768,1440}.png` (tall viewport covering showcase + ecosystem)

## Routes and links verified

Build emitted routes for all preferred marketing pages. Navigation and footer destinations point at real local paths. CTAs use `/contact?intent=demo`, `/platform`, `/get-started`, `/pricing`, `/login`. External production origin `https://lumenxtech.in` is referenced only as informational marketing context on Login — not as a false “live Astro site” canonical.

Template license attribution (TailGrids / ThemeWagon) is retained in the footer.

## Typography system (Luma Studio + Prata)

### Font inspection

| Face | Status | Source / license |
|------|--------|------------------|
| **Prata** (body / UI) | Installed | `@fontsource/prata@5.3.0` — SIL OFL 1.1; weight **400 only**; WOFF2 + `font-display: swap` via Fontsource CSS |
| **Luma Studio** (headings) | **Not in repo** | No `.woff` / `.woff2` / `.ttf` / `.otf` under Play Astro, LumenX monorepo, or searched system folders. Commercial face — not on Google Fonts. Do not load from unauthorized mirrors. |

Drop-in path for licensed Luma Studio WOFF2: `public/fonts/luma-studio/` (see `public/fonts/README.md`). `@font-face` rules live commented in `src/styles/luma-studio.css` so missing files never 404.

### Tokens and wiring

- CSS variables in `src/styles/typography.css`: `--font-heading` → Luma Studio stack; `--font-body` → Prata stack
- Tailwind `fontFamily.heading` / `body` / `sans` map to those variables (`tailwind.config.cjs`)
- Global load in `src/layouts/Layout.astro`: `@fontsource/prata/400.css` + `typography.css` (Inter CDN removed)
- Element mapping: `h1–h6` + `.font-heading` → heading stack; `body`, `p`, `li`, nav/footer links, buttons, labels, inputs → Prata
- Card/product titles that are `<span>`s use `font-heading` in `Productssection`, `Ecosystemsection`, `Pricingsection`
- Hierarchy tweaks (without changing Play type scale): slightly tighter heading letter-spacing, `text-wrap: balance`, body `line-height` ~1.75 for serif readability, nav/button line-height 1.45

Until Luma Studio files exist, headings render with **Segoe UI / system-ui** fallbacks while keeping the `"Luma Studio"` family name first in the stack.

### Files changed (typography)

- `src/styles/typography.css` (new)
- `src/styles/luma-studio.css` (optional faces, disabled)
- `public/fonts/README.md` (licensing + enable steps)
- `src/layouts/Layout.astro` (Prata + typography imports)
- `tailwind.config.cjs` (`fontFamily` heading/body/sans)
- `package.json` / lockfile (`@fontsource/prata`)
- Component `font-heading` on product/pricing/ecosystem title spans

### Typography validation (2026-10-26)

| Check | Result |
|-------|--------|
| `npm run build` | Succeeded — **27 pages** (Astro 3.6.4) |
| Home 390 / 768 / 1440 | `docs/screenshots/type-home-{390,768,1440}.png` — Prata visible on hero/body; headings use Luma fallback; no overflow/clip |
| Pricing 1440 + 390 | `type-pricing-1440.png`, `type-pricing-390.png` — card titles heading stack; plan copy Prata; grid intact |
| Platform / login / contact / about / get-started 1440 | `type-platform-1440.png`, `type-login-1440.png`, `type-contact-1440.png`, `type-about-1440.png`, `type-get-started-1440.png` |
| Duplicate font loads | Single Prata 400 import; Inter unused for UI; Luma faces not requested until files exist |
| Limitation | Live Luma Studio glyphs require licensed WOFF2 drop-in + enabling `luma-studio.css` |

## About / ecosystem visual composition fix (2026-10-26)

### Root cause

The homepage About block (`Aboutsection.astro` — left copy + right image cluster with “6 Products in one ecosystem”) used the Play template’s **fixed-height** slots (`sm:h-[400px]`, `sm:h-[220px]`, etc.) with **`object-cover`**. That cropped:

- Admin landscape screenshot (`about-image-01.jpg`, 1918×1054 — identical to `admin/command.png`)
- Connect portrait screenshot (`about-image-02.jpg`, 609×1301 — identical to `connect/home.jpg`)

### Fix

- Rebuilt the right-hand cluster as a deliberate flex/grid composition (no absolute image offsets):
  1. **Admin** full-width landscape on top — native aspect, `object-contain`, light mat padding
  2. **Connect** portrait + **“6 Products”** stat card in a two-column row beneath with shared gaps
- Mobile stacks Admin → Connect → Stats
- Left copy / CTA unchanged

### Files / validation

- Changed: `src/components/Aboutsection.astro`
- Screenshots: `docs/screenshots/about-eco-final-{390,768,1440}.png` and `about-eco-*.png`
- Production build: **27 pages** after removing temporary QA route

## Product card screenshot cropping fix (2026-10-26)

### Root cause

Showcase cards used a fixed `aspect-[16/10]` (later shared) stage with `h-full w-full object-cover object-top` plus `overflow-hidden`. That is correct for decorative photography but **crops application UIs**:

| Asset | Dimensions | Ratio | Effect under `object-cover` |
|-------|------------|-------|-------------------------------|
| Admin `command.png` | 1918×1054 | ~1.82 (desktop) | Sides / chrome clipped |
| Connect `home.jpg` | 609×1301 | ~0.47 (mobile) | Top/bottom chrome clipped |
| Transport `driver-home.jpg` | 610×1293 | ~0.47 | Same |
| Admissions `institute-access.jpg` | 610×1190 | ~0.51 | Same |
| Careers `home.jpg` | 610×1187 | ~0.51 | Same |
| Nexus | — | — | No authentic screenshot (placeholder retained) |

### Fix

- Shared **4:3** preview stage (`.lx-shot-stage`) with a light mat (`#E8EEF6`) so letterboxing stays visible in dark mode
- Inner `.lx-shot-frame` + `.lx-shot` with `width/height: 100%` and **`object-fit: contain`** (both axes required for contain to letterbox)
- Disabled card-hover image scale on `.lx-shot` (scale + overflow was re-clipping)
- Applied on homepage `Productssection.astro`, ecosystem Admin hub, and product `ContentPage` hero images
- Nexus keeps the honest “screenshot pending” placeholder — no fabricated UI

### Files changed

- `src/components/Productssection.astro`
- `src/components/Ecosystemsection.astro`
- `src/components/ContentPage.astro`
- `src/styles/motion.css` (`.lx-shot-stage` / `.lx-shot-frame` / `.lx-shot`)

### Validation

| Check | Result |
|-------|--------|
| `npm run build` | Succeeded — **27 pages** |
| Isolated contain test | `docs/screenshots/shots-contain-test.png` — full Admin + mobile UIs letterboxed, not covered |
| Home 360 / 390 / 768 / 1024 / 1440 | `docs/screenshots/shots-home-cards-{360,390,768,1024,1440}.png` |
| Platform 1440 | `docs/screenshots/shots-platform-page-1440.png` |
| Still missing | **Nexus** authentic UI screenshot |

Letterboxing (gray mat beside portrait shots / above-below wide Admin) is intentional so every pixel of the source screenshot remains visible inside a consistent card height.

## Motion, animations & interactions (2026-10-26)

### Inspection

Play template marked many blocks with inert `wow fadeInUp` / `data-wow-delay` classes, but **WOW.js / Animate.css were never loaded**. Dependencies present: Astro 3.6, Tailwind 3.3, Swiper (testimonials only — not mounted), no Framer Motion / GSAP. **No new animation libraries added** — CSS tokens + IntersectionObserver.

### Motion tokens (`src/styles/motion.css`)

| Token | Value | Use |
|-------|--------|-----|
| `--motion-fast` | 160ms | Micro-interactions |
| `--motion-ui` | 240ms | Buttons, nav, accordion |
| `--motion-section` | 520ms | Entrances / reveals |
| `--motion-stagger` | 60ms | Child stagger |
| `--motion-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances |
| `--motion-distance` | 18px | Reveal translateY |

### Components animated / improved

| Area | Behavior |
|------|----------|
| Hero | Staggered title → copy → CTAs → preview; soft ambient glow; readable without JS |
| Scroll reveals | `reveal.js` observes `.wow.fadeInUp` + `[data-reveal]`; off-screen gets `.is-pending`, once-only `.is-revealed` |
| Product cards | `.lx-card` hover elevation, border, image scale, CTA nudge; focus-visible |
| Ecosystem | Hub emphasis + one-shot sequential strip highlight; static links remain usable |
| Pricing / roles / features | Staggered card reveals + hover polish |
| FAQ | Accessible accordion (`faq.js`): `aria-expanded`, keyboard, height via `grid-template-rows`; all answers visible if JS fails |
| Header / nav | Sticky transition (rAF scroll); LumenX logo swap fixed; desktop submenu opacity/transform + focus-within; mobile Escape-to-close; link underline cue |
| Buttons / forms | Shared `.lx-btn` hover/press/focus; input focus underline + invalid hint |
| Page load | Soft `main` opacity fade (no Astro View Transitions — avoided for forms / back-forward risk) |

### Accessibility & performance

- `prefers-reduced-motion: reduce` disables reveals, hero choreography, eco pulse, page fade, and large transforms; content stays visible.
- Hover lift gated with `@media (hover: hover)`.
- No layout-property animation for cards (transform/opacity/shadow only).
- Reveal pending applied only to off-viewport nodes (avoids FOUC / blank hero).

### Not applicable on this site

- No product preview **tabs** fabricated beyond real product routes.
- Interactive **pricing calculator** is implemented (see Pricing correction below).
- Testimonials carousel (Swiper) remains unmounted.

### Motion validation

| Check | Result |
|-------|--------|
| `npm run build` | Succeeded — **27 pages** |
| Responsive shots | `docs/screenshots/motion-home-{360,390,768,1024,1440}.png`, `motion-pricing-1440.png`, `motion-platform-1440.png` — no overflow/clip observed |
| Dependencies added | **None** |

### Limitations

- Headless Chrome screenshots capture post-entrance frames; live hover/accordion timing should be spot-checked in a real browser.
- Sticky logo swap on non-home pages that lack `.header-logo` is unchanged (inner pages use dual light/dark img tags).

## Header single-row navigation fix (2026-10-26)

### Problem
Desktop header wrapped to two rows; crude SVG wordmark could misread as “LIMC PX”; Contact / Login / theme collided with nav.

### Layout

| Zone | Contents |
|------|----------|
| Left | Authentic `lumenx-mark.png` mark + HTML **LumenX** wordmark |
| Center | Home → Platform → Solutions → Modules → Pricing → Resources → About (`flex-nowrap`, compact `text-sm`) |
| Right | Theme · Contact · Login · Book a Demo |

- Desktop (≥960px / `lg`): one horizontal row; hamburger hidden; `white-space: nowrap` on nav items; Solutions chevron stays inline.
- Below `lg`: logo + theme + hamburger; full destinations (incl. Contact / Login / Demo) inside the mobile panel.
- Home / About retained — not removed to fix wrapping.

### Browser checks (CDP viewport, deviceScaleFactor=1)

| Width | Desktop nav | Hamburger | Bar height | Wrap |
|------:|-------------|-----------|------------|------|
| 360 | hidden | shown | 70 | no |
| 390 | hidden | shown | 70 | no |
| 768 | hidden | shown | 70 | no |
| 1024 | flex (1 row) | hidden | 76 | no |
| 1280 | flex (1 row) | hidden | 76 | no |
| 1440 | flex (1 row) | hidden | 76 | no |
| 1920 | flex (1 row) | hidden | 76 | no |

Screenshots: `docs/screenshots/header-nav-{360,390,768,1024,1280,1440,1920}.png`

### Checks
| Check | Result |
|-------|--------|
| `npm run build` | **27 pages** succeeded |
| `npm run test:pricing` | **21 passed** |
| Wordmark text | `LumenX` (not path-rendered) |

## Premium pricing UI, recommended plan & motion upgrade (2026-10-26)

### Visual hierarchy (billing durations)

| Plan | Treatment |
|------|-----------|
| **3 months** | Standard card; total + service duration; no badge |
| **6 months** | `Recommended` badge; LumenX blue accent; default selected; restrained elevation |
| **12 months** | `Best value` badge; green savings accents; “Save ₹…” chip; strongest card emphasis |

Annual quote panel (when 12 months selected): normal `M×12`, discount `−(M×2)` in green, final `M×10`. Example verified in UI: **900 students × ₹10** → subtotal/monthly ₹9,000; normal ₹1,08,000; discount −₹18,000; final ₹90,000.

Pricing formulas unchanged (`src/utils/pricing.js`). No new animation libraries.

### Interaction / motion system updates

| Area | Change |
|------|--------|
| Calculator | Plan cards + custom rate input; live totals on each plan; soft `is-updating` pulse on values (no counting animation) |
| Anchors | `src/scripts/smoothscroll.js` — smooth hash scroll with sticky-header offset; respects reduced motion; preserves history |
| Motion CSS | Plan card hierarchy, savings pulse, rate chips, button icon nudge hooks; `scroll-behavior` with reduced-motion override |
| Existing system | Hero stagger, scroll reveals, FAQ accordion, nav dropdown, card hover retained |

### Accessibility

- Radiogroups labeled; visually hidden radios; focus rings on chips/cards
- Quote panel `aria-live="polite"` / `aria-atomic="true"`
- `prefers-reduced-motion: reduce` disables reveals, value pulse, plan lift, page fade; content remains visible

### Browser screenshots (executed)

| File | Viewport / note |
|------|-----------------|
| `docs/screenshots/premium-pricing-390.png` | 390px |
| `docs/screenshots/premium-pricing-768.png` | 768px |
| `docs/screenshots/premium-pricing-1024.png` | 1024px |
| `docs/screenshots/premium-pricing-1440.png` | 1440px (default Recommended / 6 months) |
| `docs/screenshots/premium-pricing-annual-1440.png` | 1440px with **12 months** selected + annual breakdown |
| `docs/screenshots/premium-home-1440.png` | Home hero |

### Checks run

| Check | Result |
|-------|--------|
| `npm run test:pricing` | **21 passed, 0 failed** (includes 900×₹10 annual = ₹90,000) |
| `npm run build` | **27 pages** succeeded |
| Manual UI via headless Chrome | Plan badges, ₹10 default, savings chip, annual panel confirmed in screenshots |

**Not claimed:** automated keyboard E2E suite or device-lab touch testing beyond headless captures.

## Pricing correction (final approved business rules)

### Formula

```
calculatedAmount = studentCount × ratePerStudent   // custom rate ≥ ₹10 (no upper limit)
monthlyPayable   = max(8000, calculatedAmount)     // ₹8,000 is a floor, never an add-on
3 / 6 months     = monthlyPayable × 3 or × 6
12 months        = monthlyPayable × 10  (service = 12; discount = monthlyPayable × 2)
```

### Rules implemented

| Rule | Implementation |
|------|----------------|
| ₹8,000 = minimum monthly payable (not a separate fee) | `PRICING.minimumMonthly`; `monthlyPayable = max(8000, subtotal)` |
| Custom rate ≥ ₹10 (default ₹10; no upper limit) | `PRICING.rateMin` / `defaultRate` / `normalizeRate` |
| Durations 3, 6, 12 months | ids `3m` / `6m` / `12m` |
| Annual: normal ×12, discount ×2, final ×10 | `calculateQuote` annual breakdown fields |
| Never ₹8,000 + student subtotal | Single `max()` path in `calculateMonthly` |
| No invented fees / eligibility / taxes | Cards, FAQ, calculator only show approved amounts |

### Locations updated

| Location | Change |
|----------|--------|
| `src/utils/pricing.js` | `calculateMonthly`, `calculateQuote`, rate bounds, duration helpers |
| `src/components/Pricingsection.astro` | Cards: per-student rate, campus minimum, billing durations |
| `src/components/PricingCalculator.astro` | Students + rate + duration; subtotal, monthly, minimum note, annual breakdown |
| `src/pages/pricing.astro` / `index.astro` | Meta + cards + calculator |
| `src/pages/get-started.astro` / `terms.astro` | Aligned copy |
| `src/data/lumenx.js` FAQs | Minimum-floor + rate-range + annual discount language |
| `scripts/pricing.test.mjs` | Approved example matrix |

### Calculator UI

1. Editable student count.
2. Numeric “Rate per student / month (₹)” input (default ₹10, minimum ₹10).
3. Duration: 3 / 6 / 12 months (plan cards).
4. Shows per-student subtotal, monthly payable, and when the ₹8,000 minimum applies.
5. For 12 months: normal 12-month amount, two-month discount, final payable.
6. Live INR-formatted summary; recalculates on every input change. Invalid rates clear the quote.

### Tests (`npm run test:pricing`) — actual results

| Case | Expected | Result |
|------|----------|--------|
| 300 × ₹15 | subtotal ₹4,500 → monthly ₹8,000 | Pass |
| 500 × ₹15 | subtotal ₹7,500 → monthly ₹8,000 | Pass |
| 667 × ₹12 | subtotal ₹8,004 → monthly ₹8,004 | Pass |
| 900 × ₹10 | monthly ₹9,000 | Pass |
| 900 × ₹12 | monthly ₹10,800 | Pass |
| 1,000 × ₹15 | monthly ₹15,000 | Pass |
| Never add ₹8,000 on top | Pass | Pass |
| Annual at ₹8,000 | ₹96,000 − ₹16,000 = ₹80,000 | Pass |
| Annual at ₹10,800 | ₹129,600 − ₹21,600 = ₹108,000 | Pass |
| 3m / 6m same monthly | Pass | Pass |
| Rate bounds / invalid students / INR format | Pass | Pass |

**20 passed, 0 failed.**

### Remaining pricing-related content (intentional)

- **60-day trial** after verification (FAQ, get-started, CTA) — separate from the annual two free months.
- Contact / demo CTAs mention trials/quotes without inventing extra fees.
- Resources page links to `/pricing` without restating amounts.
- Platform / product / solution pages have **no** pricing figures.

### Superseded claims (removed)

- “Choose institute **or** student model” alternative pricing
- Fixed ₹12-only student rate; fixed ₹10–₹15 chip range (replaced by custom rate ≥ ₹10)
- Framing ₹8,000 as a separate institute fee instead of a monthly minimum

## Pricing calculator redesign (2026-10-26)

Informational rate/minimum/duration explanation cards were removed. Pricing is one calculator with **three subscription-duration plan cards**.

### Plan cards (required layout)

| Card | Label / badge | Shows |
|------|---------------|--------|
| **3 Months** | Standard (kicker, not a promo badge) | Dynamic 3-month total · “3 months of service” |
| **6 Months** | **RECOMMENDED** (blue) | Dynamic 6-month total · “6 months of service” |
| **Annual Plan** | **BEST VALUE** (green) | Offer line “12 months of service. Pay for only 10 months.” · regular 12-month price · two-month discount as −amount · final payable prominent |

Student count + custom rate input update all three cards live. Selecting a card updates the calculator summary. Keyboard arrow navigation between plans is supported.

### Logic (shared `src/utils/pricing.js`)

`monthlyPayable = max(8000, students × rate)` · 3m ×3 · 6m ×6 · annual regular ×12, discount ×2, final ×10 · ₹8,000 never additive

### Validation (actual results)

| Check | Result |
|-------|--------|
| `npm run test:pricing` | **21 passed, 0 failed** |
| `npm run build` | Succeeded — **27 pages** |
| CDP plan cards | Labels `3 Months` / `6 Months` / `Annual Plan`; badges Recommended + Best Value only; Standard kicker present |
| CDP math | 300×₹15 → 3m ₹24,000; 900×₹10 → 6m ₹54,000; annual card ₹1,08,000 − ₹18,000 = ₹90,000; 1000×₹15 annual ₹1,80,000 − ₹30,000 = ₹1,50,000 |
| Info-card residue | Absent |
| Screenshots | `qa-artifacts/pricing-ui/pricing-6m-1440.png`, `pricing-12m-1440.png`, `pricing-min-390.png` |

**Not deployed.**

## Full product landing pages (2026-10-26)

Sparse `/platform/[slug]` ContentPage shells were replaced with a reusable, configurable product-page system. Each product now has a benefit-focused landing page with verified modules only.

### Architecture

| Piece | Role |
|-------|------|
| `src/data/product-pages.js` | Per-product headlines, problem, modules, workflows, roles, Connect experiences, gallery, CTA |
| `src/components/product/ProductPage.astro` | Orchestrates sections |
| `ProductHero`, `ProductProblem`, `ProductModules`, `ProductWorkflow`, `ProductExperiences`, `ProductRoles`, `ProductGallery`, `ProductCta` | Shared section components |
| `src/scripts/product-gallery.js` | Accessible screenshot tabs (arrow keys, Home/End, ARIA) |
| `src/pages/platform/[slug].astro` | Loads `getProductPage(id)` into `ProductPage` |

Existing routes preserved: `/platform/admin|connect|transport|admissions|careers|nexus`.

### Pages expanded

| Page | Headline | Modules (verified) | Screenshots |
|------|----------|--------------------|-------------|
| Admin | Run your institution from one operational core. | People, academics, attendance, fees, communications, documents, leave, transport hub, admissions/careers review, analytics, roles/modules/settings | 7 Admin shots |
| Connect | One connected experience for teachers, parents and students. | Attendance, homework, timetable, marks/exams, fees visibility, messages, transport status + **three role experience sections** | 9 Connect shots |
| Transport | Bring transport operations into a dedicated workflow. | Driver trips, boarding, Admin fleet assignment, emergency notes, parent trip status | 4 Transport shots |
| Admissions | Make the admissions journey more organized. | Programs/access, applications, documents, review/status, convert-to-student | 2 Admissions shots |
| Careers | Connect opportunities with talent. | Jobs, applications, profiles, interviews (file-level), recruiter workspace, convert-to-teacher | 3 Careers shots |
| Nexus | Support the entire ecosystem. | Institutes/registrations, modules/billing, health/audit, support/templates, access/policies | **None** — honest placeholder only |

### Explicit non-claims retained

- No live parent GPS telematics / map product positioning for Transport
- No SMS/phone dispatch for emergencies
- Careers is not payroll, attendance, or a full HRMS
- Nexus is not the school ERP
- No fabricated Nexus UI

### Product-page validation (actual results)

| Check | Result |
|-------|--------|
| `npm run build` | Succeeded — **27 pages** |
| `npm run test:pricing` | **21 passed, 0 failed** |
| Preview DOM checks | Headlines + CTAs + key modules present on all six product URLs |
| Screenshot assets | HEAD 200 for Admin/Connect/Transport/Admissions/Careers paths used |
| Responsive CDP | `qa-artifacts/product-pages/{admin,connect,transport,nexus}-{390,768,1024,1440}.png` — no horizontal overflow (`scrollWidth ≈ clientWidth`) |
| Lazy images | Below-fold `loading="lazy"` may report `naturalWidth=0` before scroll; asset URLs resolve 200 |

**Not deployed.**

## Institutional copy pass (2026-10-26)

Positioning updated for institute owners, principals, and administrators: LumenX as a **connected institute management ecosystem**, not a standalone school app. Layout, branding, fonts (Luma Studio headings / Prata body), pricing math, and interactive behavior were preserved.

### Homepage storytelling order

1. **What is LumenX?** — `Hero` (eyebrow, headline, supporting copy, CTAs, Admin dashboard)
2. **Institutional problem** — `Aboutsection` (“Built around the way institutions work.”)
3–4. **Products / how each helps** — `Productssection` + `Ecosystemsection` + `Features`
5. **Who it’s for** — `Rolessection`
6. **Pricing** — `Pricingsection` + `PricingCalculator` + `Faq`
7. **Next step** — `CTAsection` + `Contactsection`

### Hero (approved copy)

| Element | Copy |
|---------|------|
| Eyebrow | INSTITUTE MANAGEMENT ECOSYSTEM |
| Headline | One connected ecosystem. Smarter institutions. |
| Support | From academics and administration to communication, transport, admissions, and hiring — LumenX brings your institution's essential workflows together. |
| Primary CTA | Book a Demo → `/contact?intent=demo` |
| Secondary CTA | Explore the Platform → `/platform` |
| Visual | Authentic Admin dashboard (`/assets/hero/hero-dashboard.png`) |

### Product positioning taglines

| Product | Tagline |
|---------|---------|
| Admin | Your institution's operational core. |
| Connect | Keep your campus connected. |
| Transport | Bring transport workflows together. |
| Admissions | Simplify the admissions journey. |
| Careers | Connect opportunities with talent. |
| Nexus | Support the entire ecosystem. |

Bodies remain the approved descriptions in `src/data/lumenx.js` (no unimplemented capability claims).

### About

- Page + section heading: **Built around the way institutions work.**
- Explains connected institutional workflows and each product’s defined purpose
- No invented history, founders, customer counts, testimonials, certifications, or market leadership

### Pricing language consistency

- Monthly student subtotal = students × custom rate (≥ ₹10)
- Monthly payable = greater of that subtotal or ₹8,000 (never additive)
- Billing: 3 / 6 / 12 months; annual = 10 monthly amounts for 12 months of service
- Calculator shows **Two-month discount** explicitly on annual selection
- FAQ, get-started, pricing page meta, and section intros use the same rules

### Files touched (copy pass)

- `src/data/lumenx.js` — SITE description, product taglines, FAQs
- `src/components/Hero.astro`, `Aboutsection.astro`, `Productssection.astro`, `Ecosystemsection.astro`, `Features.astro`, `Rolessection.astro`, `Pricingsection.astro`, `CTAsection.astro`, `Faq.astro`, `Contactsection.astro`
- `src/pages/index.astro` (section order), `about.astro`, `platform/index.astro`
- `src/styles/motion.css` — hero eyebrow included in entrance motion

### Copy-pass validation (actual results)

| Check | Result |
|-------|--------|
| `npm run test:pricing` | **21 passed, 0 failed** |
| `npm run build` | Succeeded — **27 pages** (Astro 3.6.4 + static + compress) |
| `npm run preview` | Served at `http://127.0.0.1:4321` |
| DOM assertions (home / about / pricing / platform / get-started) | Hero headline, eyebrow, CTAs, product taglines, About heading, pricing greater-of / two-month discount present |
| CDP browser (Chrome headless) | Home hero + dashboard visible after `is-ready`; About heading confirmed; Pricing calculator at 900×₹10 annual shows normal ₹1,08,000, two-month discount −₹18,000, final ₹90,000 |
| Screenshots | `qa-artifacts/copy-pass/home-1440-cdp.png`, `about-1440-cdp.png`, `pricing-calc-cdp.png`, `home-390-cdp.png` |

**Not deployed.** Preview was local only.

## Customizable per-student rate (2026-10-26)

Fixed ₹10–₹15 rate chips were replaced with a numeric **Rate per student / month (₹)** input. Validation lives in shared `src/utils/pricing.js` (`normalizeRate`), not only in the UI.

### Rules

| Rule | Detail |
|------|--------|
| Default | ₹10 |
| Minimum | ₹10 (inclusive) |
| Upper limit | None |
| Rejected | Blank, non-finite, NaN, Infinity, values &lt; ₹10 |
| Invalid state | Inline error; all three plan cards + summary show em dash; no valid quote |
| Formulas | Unchanged: `monthlyPayable = max(8000, students × rate)`; 3m×3; 6m×6; annual ×12 / −×2 / final ×10 |

### Files

| File | Change |
|------|--------|
| `src/utils/pricing.js` | `rateMin` / `defaultRate`; removed `rates` chip list; `normalizeRate` accepts any finite ≥ 10 |
| `src/components/PricingCalculator.astro` | Number input `#lx-rate` + `#lx-rate-error`; no rate chips |
| `src/data/lumenx.js` / pricing meta | Copy: “₹10 or more” |
| `scripts/pricing.test.mjs` | Custom-rate cases (25 total) |
| `scripts/pricing-ui-verify.mjs` | CDP cases for ₹10 / ₹12 / ₹20 / ₹50 + reject 9.99 / blank / 0 |

### Unit tests (`npm run test:pricing`) — **25 passed, 0 failed**

Includes prior matrix plus: default ₹10; accept ₹12 / ₹20 / ₹50; reject ₹9.99 / 0 / blank / invalid.

### CDP UI (`scripts/pricing-ui-verify.mjs`) — **PRICING UI PASS**

| Case | Result |
|------|--------|
| Default ₹10, 900 students, 6m | Monthly ₹9,000 · total ₹54,000 · no rate chips |
| Custom ₹12, 3m | Monthly ₹10,800 · total ₹32,400 |
| Custom ₹20, annual | Regular ₹2,16,000 · discount −₹36,000 · final ₹1,80,000 |
| Custom ₹50, 200 students, annual | Subtotal/monthly ₹10,000 · final ₹1,00,000 |
| Below floor (300 × ₹15) | Subtotal ₹4,500 → monthly ₹8,000 · 3m ₹24,000 |
| Reject ₹9.99 / blank / 0 | Error visible; totals cleared to — |

### Build

`npm run build` — **27 pages** succeeded. Preview used for CDP only. **Not deployed.**

## Website polish — spacing, pricing accuracy, 3D ecosystem (2026-10-26)

### 1. Product card / section spacing

| File | Change |
|------|--------|
| `src/styles/section-layout.css` | Shared tokens for section padding, intro hierarchy, product grid gaps, card padding, typography rhythm |
| `src/components/Productssection.astro` | Uses `lx-section` / `lx-product-grid` / `lx-product-card` structure |
| `src/layouts/Layout.astro` | Imports `section-layout.css` + `ecosystem-orbit.css` |

Headings, labels, taglines, body copy, and CTAs use distinct vertical rhythm; CTA sits after body with clear separation; grid uses balanced `1 / 2 / 3` columns.

### 2. Pricing accuracy (sitewide)

Shared formula only via `src/utils/pricing.js`:

`monthlyPayable = max(8000, students × customRate)`

| Surface | Update |
|---------|--------|
| Calculator intro + summary note | States ₹8,000 is a **minimum monthly payable**, not a fixed institute price |
| FAQ / get-started / pricing breadcrumb | Same formula + 900×₹10 and 500×₹15 examples |
| Plan cards + summary | Still driven only by `calculateQuote` / `calculateMonthly` |

Verified CDP cases:

| Case | Result |
|------|--------|
| 900 × ₹10 annual | Subtotal ₹9,000 · monthly **₹9,000** · normal ₹1,08,000 · discount −₹18,000 · final ₹90,000 |
| 500 × ₹15 annual | Subtotal ₹7,500 · monthly **₹8,000** · normal ₹96,000 · discount −₹16,000 · final ₹80,000 |

### 3. Ecosystem orbital diagram

Repeated hub/satellite/strip cards under “Each product helps a defined part of campus life” were replaced with a conceptual 3D orbital diagram.

| Piece | Detail |
|-------|--------|
| `src/components/Ecosystemsection.astro` | Admin hub (logo + Admin preview), orbit nodes Connect/Transport/Admissions/Careers, Nexus as platform-services layer |
| `src/styles/ecosystem-orbit.css` | Dark navy stage, rings, SVG paths/particles, hover/focus highlight, mobile connected list |
| Motion | CSS ring rotation + SVG particles; `prefers-reduced-motion` disables motion; nodes remain keyboard-focusable and link to product pages |
| Claims | Caption states this is a conceptual map — not live data sync |

Six-product grid above is preserved.

### Screenshots (`qa-artifacts/polish-pass/`)

`home-products-{390,768,1024,1440}.png` · `ecosystem-{390,768,1440}.png` · `ecosystem-reduced-motion-1440.png` · `pricing-900x10-1440.png` · `pricing-500x15-1440.png` · `pricing-390.png`

### Checks

| Check | Result |
|-------|--------|
| `npm run test:pricing` | **25 passed** |
| `npm run build` | **27 pages** |
| `scripts/pricing-ui-verify.mjs` | **PRICING UI PASS** |
| `scripts/polish-ui-verify.mjs` | **POLISH UI PASS** (orbit nodes/links, no old eco cards, no overflow, focus caption, pricing cases) |

### Remaining limitations

- Nexus still has no authentic UI screenshot (placeholder initial in product grid).
- Orbit motion is CSS/SVG only (no WebGL); depth is perspective rings, not true 3D mesh.
- Mobile ecosystem uses a simplified connected list instead of the full orbit.

**Not deployed.**

## Downloads page + enquiry forms (2026-10-26)

### Downloads (`/downloads`)

| File | Role |
|------|------|
| `src/data/downloads.js` | Approved platform matrix + env-overridable destinations |
| `src/pages/downloads.astro` | Product cards with honest Available / Coming soon actions |
| `scripts/downloads-verify.mjs` | Matrix shape + live HEAD/GET probes |
| `.env.example` | `PUBLIC_*` download URL documentation |

Nav / footer / resources link to `/downloads`.

**Approved matrix (enforced):**

| Product | Platforms |
|---------|-----------|
| Admin | Web + Android + Windows |
| Connect | Android only |
| Transport | Android only |
| Careers | Web + Android |
| Admissions | Web + Android |
| Nexus | Android + Windows (**no web download option**) |

**Verified destinations (HTTP 200 during implementation):**

| Kind | Destination |
|------|-------------|
| Web | `admin`, `careers`, `admissions` on `*.lumenxtech.in` |
| Android APKs | `https://lumenx-downloads.official-lumenx.workers.dev/android/{admin,connect,transport,careers,admissions,nexus}.apk` |
| Windows | `…/windows/admin-setup.exe`, `…/windows/nexus-setup.exe` |

`downloads.lumenxtech.in` still does **not** resolve — Worker host is used until DNS/CDN cutover. Play Store URLs are optional via `PUBLIC_*_PLAY_URL` (unset → APK).

### Enquiry forms (homepage `#enquiry`)

| File | Role |
|------|------|
| `src/components/Enquirysection.astro` | Three selectable forms before footer contact |
| `src/utils/enquiry.js` | Shared client validation |
| `src/scripts/enquiry-forms.js` | Submit UX, honeypot, duplicate-click guard |
| `functions/api/enquiry.js` | Cloudflare Pages Function — server validation, rate limit, delivery |
| `scripts/enquiry.test.mjs` | Validation unit tests |

Types: `question` · `demo` · `custom_application`. Destination inbox: **`lumenxtech.official@gmail.com`**.

Delivery order: `/api/enquiry` (Pages Function with `WEB3FORMS_ACCESS_KEY` / `RESEND_API_KEY`) → optional `PUBLIC_WEB3FORMS_ACCESS_KEY` → FormSubmit AJAX to the inbox.

**Honest limitation:** Static `astro preview` has no Pages Functions. Without configured provider keys, the UI shows an error directing users to email the inbox — it does **not** fake success. End-to-end inbox delivery requires Cloudflare Pages env secrets (or FormSubmit activation for that inbox).

### Checks

| Check | Result |
|-------|--------|
| `npm run test:pricing` | **25 passed** |
| `npm run test:enquiry` | **passed** |
| `npm run test:downloads` | **DOWNLOADS VERIFY PASS** |
| `npm run build` | **28 pages** (adds `/downloads`) |

**Not deployed.**

## Build and test results

| Check | Result |
|-------|--------|
| `npm install` | Succeeded (includes `@fontsource/prata`) |
| `npm run test:pricing` | **25 passed, 0 failed** (custom rate ≥ ₹10 + annual formulas) |
| `npm run test:enquiry` | **passed** |
| `npm run test:downloads` | **DOWNLOADS VERIFY PASS** |
| `npm run build` | Succeeded — **28 pages** (Astro 3.6.4 + static + compress) |
| CDP pricing UI | `scripts/pricing-ui-verify.mjs` — **PRICING UI PASS** |
| CDP polish pass | `scripts/polish-ui-verify.mjs` — **POLISH UI PASS** |
| Lint / format scripts | Not defined in Play `package.json` (`dev` / `build` / `preview` / `test:pricing`) |
| TypeScript project check | N/A as a separate script; Astro content types generated successfully |
| Homepage demo residue scan | No “Play Astro” / Lorem / ThemeWagon marketing claims in `dist/index.html` body content (footer keeps required distributor credit) |
| Responsive screenshots | Motion: `motion-home-{360,390,768,1024,1440}.png`; typography: `type-home-*`; showcase: `showcase-home-*`; copy pass: `qa-artifacts/copy-pass/*-cdp.png` |

**Not claimed:** automated a11y suite, full E2E nav click-through, or production deploy.

## Remaining placeholder / template residue

- Unused Play components remain in `src/components/` (`Team`, `Testimonials`, `Clients`, `Blogsection`, etc.) but are **not** mounted on the homepage
- Demo blog markdown remains under `src/content/blog/` with `draft: true` (not published)
- Original Play brand SVGs remain under `public/assets/brands` and `footer/brands` (unused on customized pages)
- `LICENSE` / ThemeWagon attribution kept intentionally

## Deployment requirements and next steps

1. Host the static `dist/` output (Netlify, Cloudflare Pages, S3+CDN, etc.) — this is a separate Astro site from the React website
2. Set production `site` / canonical URL in Astro config only when the live domain for **this** Astro build is confirmed
3. Wire contact form to a real backend (current form uses `mailto:` fallback)
4. Optionally replace SVG wordmarks with final official logo lockups
5. Expand product page screenshot galleries
6. Decide whether this Astro site replaces or coexists with `apps/website` (React) — do not overwrite the React repo by accident
7. Run visual QA on real devices after deploy; enable sitemap when domain is live
8. Drop licensed Luma Studio WOFF2 into `public/fonts/luma-studio/` and enable `src/styles/luma-studio.css` (see `public/fonts/README.md`)

## How to run locally

```bash
cd <play-astro-project-root>
npm install
npm run dev
# or
npm run build && npm run preview
```
