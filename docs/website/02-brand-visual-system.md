# 02 — Brand & Visual System

Marketing brand is **LumenX** (ecosystem). Product apps keep their own accents. The website is the only surface that shows all four together.

## 1. Positioning

- **Name:** LumenX  
- **Voice:** Professional, warm, institute-appropriate. Plain language for principals; precise for operators. No “AI-powered OS” hype unless a capability is real.  
- **Promise:** One platform for institute operations, families, and transport — from a single branch to a group.

Wordmark on this site: **LumenX** (title case). Do not use `LUMENX ADMIN` / `LUMENX NEXUS` except on product pages as in-app chrome samples.

## 2. Color — marketing canvas

Website tokens are **ink + lumen + paper**. Product hues are accents only (chips, demos, product heroes).

| Token | Light (default) | Role |
|-------|-----------------|------|
| `--background` | Warm paper `oklch(0.985 0.008 85)` | Page |
| `--foreground` | Ink `oklch(0.22 0.04 265)` | Text |
| `--primary` | Lumen gold `oklch(0.72 0.14 75)` | Primary buttons, marks |
| `--primary-foreground` | Ink `oklch(0.22 0.05 75)` | On gold |
| `--accent` | Soft gold wash | Hover / chips |
| `--muted-foreground` | `oklch(0.48 0.03 265)` | Supporting copy |
| `--border` | Ink 10% | Hairlines |

Dark mode is supported (same structure as sibling apps) but **light is canonical** for conversion.

## 3. Product accents (do not mix as page primaries)

| Product | Accent (approx) | Source |
|---------|-----------------|--------|
| Admin | Institute indigo `oklch(~0.52 0.22 262)` | `apps/admin` `--primary` |
| Connect | Portal indigo `oklch(~0.5 0.22 260)` | `apps/connect` |
| Transport | Route blue `#2563eb` | `apps/transport` tokens |
| Nexus | Command cyan `oklch(0.58 0.13 195)` | `apps/nexus` |

On product pages, the hero can tint toward that product’s accent. Homepage uses lumen gold + ink.

## 4. Typography

| Role | Face | Notes |
|------|------|-------|
| UI / body | DM Sans | Same as Admin/Nexus — ecosystem consistency |
| Display | DM Sans, weight 600–700, tracking `-0.03em` | Hero and section titles |
| Mono | JetBrains Mono | Calculator figures, version strings |

Do not introduce a second display serif in W1.

Scale: reuse `@lumenx/ui/theme/typography.css` (`--lx-text-*`). Hero may use a one-off `clamp(2.5rem, 5vw, 4.25rem)`.

## 5. Logo

Simple mark: rounded square with a lumen bar (gold) on ink. Wordmark “LumenX” beside it. SVG in `SiteLogo` component — no PNG required for W1.

Favicon: same mark, inline SVG `public/favicon.svg`.

## 6. Photography / art

W1 uses **device frames + UI mock stages**, not stock classroom photos. W2 may add real institute photography with consent. Avoid generic “kids with tablets” stock.

## 7. Elevation

- Cards: `--shadow-elevated` (soft, not Material heavy)
- Header: translucent paper + `backdrop-filter: blur(12px)`
- Device frames: ink bezel, 12px radius, hairline gold

## 8. Do / don’t

- Do: one primary CTA per band (gold filled). Secondary is outline ink.  
- Don’t: Nexus grid background on the whole marketing site.  
- Don’t: sidebar layouts. This is a scrolling marketing site.  
- Don’t: rainbow product gradients on every card — one accent stripe is enough.
