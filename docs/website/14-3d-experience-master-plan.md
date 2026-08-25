# 14 — 3D / Motion Experience Master Plan

**Scope:** `apps/website` only  
**Status:** Active enhancement (Phase A–C in progress)  
**Depends on:** [00 Master plan](./00-website-master-plan.md), [04 Motion](./04-motion-system.md), [12 Performance](./12-performance-seo.md)

---

## 1. Audit summary (existing site)

### Stack

| Area | Finding |
|------|---------|
| Framework | TanStack Start + React 19 + Tailwind 4 |
| Motion libs | **None** — no Three.js, R3F, Framer Motion, GSAP |
| Motion model | CSS transform/opacity + `IntersectionObserver` + occasional `rAF` / `setTimeout` |
| Gate | `html.site-motion` from `prefers-reduced-motion` (`motion/boot.ts`, `motion/enable.ts`) |
| Atmosphere | Three blurred blobs in `SiteShell` |
| Hero | SVG + DOM hexagon orbit (`HomeHero`) — interactive, a11y-aware |
| Cards | CSS lift + product accent wash |
| Demos | Lazy-loaded walkthroughs; Transport has Play + PRM abort |

### Routes (unchanged)

`/`, `/products`, `/products/$slug`, `/solutions`, `/features`, `/modules`, `/how-it-works`, `/demo`, `/pricing`, `/downloads`, `/contact`, `/get-started` (+ redirects).

### A — Already excellent (do not break)

1. `site-motion` + boot-before-paint (no FOUC / no hidden content without JS)  
2. Orbit transform ownership (`--orbit-lift` / `--orbit-scale` — never fight centering)  
3. Touch: first-tap reveal, second-tap navigate  
4. Hover gated by `(hover: hover) and (pointer: fine)`  
5. Product `data-product` theming  
6. Lazy demos (Attendance eager; others deferred)  
7. Semantic SEO content separate from visuals  

### B — Weak / upgrade targets

| Area | Gap |
|------|-----|
| Hero depth | Flat 2D; little multi-layer parallax |
| Signature moment | Ecosystem does not show live data-flow |
| Cards | Familiar lift; little physical tilt/lighting |
| Atmosphere | Blobs only; always animating even when tab hidden |
| Scroll story | Section reveals only — no depth layers |
| Mobile copy | “Hover…” on touch devices |
| Demos | Discrete step swaps; little travel between roles |

### C — Do not touch

Admin / Connect / Transport / Nexus apps, backend, Supabase, Firebase, commercial pricing policy math, Core/Plus/Max jargon, SEO text content meaning.

### D — Performance risks if mishandled

- Extra full-viewport blurs  
- Continuous canvas/WebGL on all pages  
- Animating off-screen layers  
- Fighting orbit `transform` centering  

---

## 2. Technology decision

**Chosen architecture: CSS 3D + SVG data-flow + lightweight React hooks.**

| Option | Verdict |
|--------|---------|
| Three.js / R3F / Drei | **Deferred.** Heavy for LCP; game risk; needs WebGL fallback path. Revisit only if a single isolated hero canvas is required later. |
| Framer Motion / GSAP | **Not added.** Existing CSS motion covers enter/hover; avoid dual systems. |
| CSS perspective + SVG | **Primary.** Matches brand, a11y gate, and current orbit. |
| Canvas 2D particles | **Optional, HIGH tier only**, behind content, paused off-screen / hidden tab. |

**Principle:** More depth, immersion, interaction — less visual noise. No scroll-jacking. No custom cursor replacing the OS pointer.

---

## 3. Experience tiers (automatic)

| Tier | When | Behavior |
|------|------|----------|
| `reduced` | `prefers-reduced-motion` | Static visuals; no parallax / tilt / flow pulses |
| `low` | save-data, ≤2 cores, ≤2GB hint, or very constrained | Atmosphere simplified; no particles; no tilt |
| `medium` | Coarse pointer / narrow viewport | Subtle flow + depth; reduced parallax |
| `high` | Fine pointer desktop with headroom | Full parallax, tilt, mesh, particles, magnetic CTAs |

Set on `<html data-experience="…">` from `enableSiteMotion` / capability detector. Invisible to users.

---

## 4. Signature visual language

**Connected institutional ecosystem**

- Central LumenX hub  
- Six product nodes (Admin, Connect, Transport, Admissions, Careers, Nexus)  
- Soft data streams along connectors  
- Structured mesh / depth planes — not neon blobs or spinning cubes  

---

## 5. Component architecture

```
apps/website/src/experience/     # capability + hooks
apps/website/src/components/experience/  # DepthStage, TiltSurface, Magnetic, ParticleField, DataFlow
```

Reuse existing `HomeHero` orbit; enhance in place rather than replace product content.

---

## 6. Implementation phases

| Phase | Outcome | Status |
|-------|---------|--------|
| A | Audit + this plan | Done |
| B | Foundation: tiers, hooks, DepthStage, atmosphere pause/mesh | Done |
| C | Hero immersion + SVG data-flow | Done |
| D | Product card tilt + ecosystem connectors | Done |
| E | Demo travel micro-motion | Done |
| F | Mobile / a11y / fallback polish + QA | Done (lab QA remaining) |

---

## 7. Accessibility & fallback

- All motion behind `html.site-motion` and tier ≠ `reduced`  
- Keyboard / focus / live regions on orbit preserved  
- No WebGL required for Phase B–D; if canvas particles fail → omit silently  
- Text remains real HTML for SEO  

---

## 8. Performance strategy

- GPU-friendly transforms only on wrappers (not orbit node centering transforms)  
- Pause atmosphere + particles when `document.hidden` or section not intersecting  
- Lazy: particles only on home hero HIGH tier  
- Prefer CSS over JS loops; rAF only for pointer lerp  

---

## 9. Completed enhancements

- [x] Audit documented  
- [x] Experience tier + pointer field (`src/experience/`)  
- [x] Atmosphere mesh + visibility pause (`site-motion-paused`)  
- [x] Hero depth stage + SVG data-flow packets + particles (HIGH)  
- [x] Tilt product cards + magnetic primary CTA  
- [x] Ecosystem signature flow strip (Admin → … → Nexus)  
- [x] Demo bridge pulse between dual phones  
- [x] Adaptive hover/tap orbit copy  
- [x] Typecheck / eslint on new modules  

---

## 10. Known issues / remaining

- Three.js / R3F still **not** introduced (by design for LCP) — optional later isolated canvas  
- Scroll-driven camera storytelling still light (section reveals only)  
- View Transitions API for demos deferred  
- Further micro-interaction pass on product pages / nav dropdowns  
- Device lab QA (Safari, mid Android) still recommended before calling “final”  
