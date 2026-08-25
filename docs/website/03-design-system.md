# 03 — Design System

The website extends `@lumenx/ui` with a small marketing layer. New primitives live in `apps/website/src/components/`. Do not duplicate Button/Input/Card.

## 1. Layout

| Token | Value |
|-------|-------|
| Max content | `72rem` (`max-w-6xl`) |
| Narrow (prose/pricing) | `42rem`–`56rem` |
| Page gutter | `1.25rem` mobile → `2rem` desktop |
| Section Y | `4.5rem` mobile → `6.5rem` desktop |
| Header height | `4rem` |

`SiteShell` = header + `<main id="main">` + footer. Skip link “Skip to content” is required.

## 2. Marketing components

| Component | Role |
|-----------|------|
| `SiteHeader` | Sticky nav, mobile sheet, Start trial |
| `SiteFooter` | Products, legal placeholders, status |
| `Section` | Eyebrow + title + lede + children |
| `ProductCard` | Suite tile with accent stripe |
| `CtaBand` | Full-width conversion strip |
| `QuoteCalculator` | Headcount + tenure → payable |
| `DeviceFrame` | Phone/tablet bezel around demo UI |
| `DemoStage` | Switchable product mock |

Buttons: `@lumenx/ui` `Button`. Header CTA may use `size="lg"`. Links that look like buttons: `Button asChild` + TanStack `Link`.

## 3. Density

Marketing is **airier** than Admin. Default card padding `1.5rem`. Lists of capabilities: icon + title + one sentence, not data tables.

KPI-style numbers on homepage (students, apps, trial days) use large figures + caption — not `@lumenx/ui-admin` `Kpi` (wrong visual language).

## 4. Forms

Contact: name, institute, role, email, phone, student count (optional), message. Labels always visible. Errors inline. Submit disabled until email valid.

W1 submit: client acknowledgement only (toast + “We’ll reach you”). Persist to `localStorage` key `lumenx.website.leads.v1` so demos can show the form worked.

## 5. States

| State | Treatment |
|-------|-----------|
| Hover (cards) | Translate Y -2px, stronger shadow |
| Focus | `ring` token, never remove outlines |
| Disabled | 50% opacity, `cursor-not-allowed` |
| Empty (downloads) | Honest “APK not published yet” — no fake store badges |

## 6. Iconography

Lucide only. Stroke 1.75–2. Product tiles: `Building2`, `Smartphone`, `Bus`, `Radar`.

## 7. Grid

Homepage products: 1 col → 2 col (sm) → 4 col (lg).  
Solutions audiences: 1 → 2.  
Pricing tenure: 3 equal cards.
