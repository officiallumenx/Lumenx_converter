# LumenX Website — Play ThemeWagon Redesign Report

**Date:** 2026-10-24  
**Branch:** `fix/cloudflare-workers-build-upload`  
**Scope:** Marketing website only (`apps/website`)

## Architecture decision

| Item | Finding |
|------|---------|
| Website stack | React 19 + TanStack Start/Router + Vite 7 + Tailwind 4 + Cloudflare Workers |
| Play template | [TailGrids/play-tailwind](https://github.com/TailGrids/play-tailwind) (MIT) / ThemeWagon Play Astro |
| Integration choice | **Adapt Play visual patterns into the existing React site** — do not migrate to Astro |
| Rationale | Preserve pricing calculator (`QuoteCalculator` + `@lumenx/utils/subscription/pricing`), login destinations, downloads matrix, SEO helpers, CF Workers deploy, and monorepo packages |

Reference clone (local only, not shipped): `qa-artifacts/_play-ref/`

## Baseline inventory (preserved)

### Routes (existing)

`/`, `/platform`, `/platform/$slug`, `/solutions`, `/solutions/$slug`, `/modules`, `/pricing`, `/resources/*`, `/about`, `/contact`, `/get-started`, `/login`, legal (`/privacy`, `/terms`, `/cookies`, `/data-request`), downloads aliases, demos.

### Functional features preserved

- Pricing calculator on `/pricing` (`QuoteCalculator`, `quoteAllDurations`) — formulas unchanged.
- Login destinations (`getLoginAppLinks`) — Play Store / downloads / mobile web rules unchanged.
- Downloads matrix (`content/downloads.ts`) — Admin, Nexus, Connect, Transport, Admissions, Careers.
- Contact / Book a Demo search intents (`contactSearch`).
- Product pages with real screenshots and device frames.
- SEO (`pageHead`, JSON-LD), Cloudflare deploy (`wrangler` + `prepare-cf-worker-deploy.mjs`).

### Brand tokens retained

White / light paper, professional blue (`--site-brand`), dark navy (`--site-ink`), product accents. Palette not replaced with Play’s default blues beyond layout patterns.

## What changed (Play-inspired)

1. **Hero** — Full-bleed navy hero (`play-hero`) with verified claims, dual CTAs, ecosystem visual.
2. **Homepage IA** — Problem → Ecosystem → Product showcase (real screenshots) → Roles → Capabilities → Pricing teaser → FAQ → CTA.
3. **Product showcase** — Uses `/public/screenshots/*` in phone/laptop frames; Nexus not dominant.
4. **Footer** — Navy Play-style dense footer with platform / solutions / resources / company / legal.
5. **Surfaces** — Cleaner white paper tokens, softer muted sections, glass sticky header.
6. **Buttons / motion** — Existing `site-btn` system and faster page transitions kept.

## What was not done (and why)

- **No Astro migration** — would break monorepo CF Workers SSR and shared packages.
- **No invented testimonials / GPS / stats** — only verified product claims.
- **Solution URLs** remain `/solutions` with `?role=` search (existing convention); not empty `/solutions/teachers` stubs.
- **Unrelated dirty worktree** (admin/careers/admissions/backend) left untouched for this redesign.

## Build & deploy

```text
npm run build --workspace=@lumenx/app-website   # success
npm run deploy --workspace=@lumenx/app-website  # lumenx-website Worker
```

Logs: `qa-artifacts/_website-play-redesign-build.txt`, `qa-artifacts/_website-play-redesign-deploy.txt`

## Manual QA checklist

- [ ] `/` hero readable on mobile/desktop; CTAs work
- [ ] Platform / Solutions / Modules / Pricing / Resources nav destinations valid
- [ ] `/pricing` calculator still quotes monthly / 6-month / yearly correctly
- [ ] `/login` still routes Connect/Transport → Play, Admin → downloads, Admissions/Careers → web
- [ ] Product pages still show screenshots in device frames
- [ ] Contact / Book a Demo reach `/contact` with intent
- [ ] Footer links and legal pages load
- [ ] Reduced-motion preference respected

## License note

Play Tailwind is open source (MIT / TailGrids). Visual patterns were adapted; template HTML/JS was not copied wholesale into production. LumenX brand assets and screenshots remain proprietary.
