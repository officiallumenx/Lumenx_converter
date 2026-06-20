# LumenX Transport — UI Audit Report

> **Date:** 1 Jun 2026  
> **Scope:** `apps/transport_flutter` compared to `apps/connect` + `@lumenx/ui`  
> **Purpose:** Baseline audit before UI alignment (no new business features)

---

## Executive summary

LumenX Transport has a **partial manual port** of the LumenX Connect design language (colors, fonts, spacing) but implements it through a **small, isolated Flutter component set** (`Lx*`) rather than the shared monorepo UI package. Visual parity is **~60%**: tokens are close, but shell chrome, motion, empty/loading patterns, filter pills, and navigation active states diverge noticeably from Connect.

Transport management UI modules (routes, students, vehicles, drivers, trips) remain in the codebase but are **off-router** after the driver conversion — they add pattern drift and dead navigation paths.

---

## 1. Transport vs Connect — UI comparison

| Area | LumenX Connect | LumenX Transport | Parity |
|------|----------------|------------------|--------|
| **Theme source** | `styles.css` OKLCH tokens → Tailwind | `app_colors.dart` hex approximations | Partial |
| **Fonts** | Inter (body) + Sora (display) via Google Fonts | Same via `google_fonts` | Good |
| **Light mode** | Full token set (background, card, muted, accent, sidebar…) | Core colors only; no sidebar/accent/popover tokens | Partial |
| **Dark mode** | Full mirrored tokens incl. semantic colors | Missing accent, popover, ring, sidebar, dark semantic foregrounds | Partial |
| **Radius** | `--radius: 1rem`; cards `rounded-2xl` (24px) | Cards use `radiusLg` (16px) | Gap |
| **Shadows** | `shadow-soft`, `shadow-elevated`, `shadow-glow` | Implemented in `app_shadows.dart` but underused | Partial |
| **Cards** | `surface-card`: border + soft shadow + hover elevation | `LxCard`: border + soft shadow; no hover elevation | Gap |
| **Buttons** | shadcn: 6 variants, 4 sizes, `rounded-md` | `LxButton`: 5 variants, 1 size, `rounded-lg` | Gap |
| **Page header** | Sora responsive `text-xl→3xl`, muted subtitle | Fixed `headlineSmall`, no breakpoint scaling | Gap |
| **Stat cards** | Uppercase label, display value, tone backgrounds | Similar concept; layout/spacing differs | Partial |
| **Empty states** | Dashed border, primary/10 icon tile, Sora title | Plain centered icon, no dashed container | Gap |
| **Loaders** | `Skeleton` pulse + `PageSkeleton` layout | Custom `LxSkeleton` shimmer; per-feature loading views | Partial |
| **Filters** | Pill toggles: `rounded-full`, primary fill when active | Material `FilterChip` (M3 style) duplicated per feature | Gap |
| **Search** | `CommandDialog` (⌘K), debounced | `LxTextField` in admin modules only; desktop shell search is **no-op** | Gap |
| **Dialogs** | `AlertDialog` / `Sheet` with `rounded-2xl` | `LxDialog` minimal confirm | Partial |
| **Toasts** | Sonner `Toaster` top-center | `SnackBar` ad hoc | Gap |
| **Animations** | `animate-in-up` page enter, reduced-motion respect | No page transitions | Gap |
| **Navigation shell** | Glass header, theme toggle, sidebar glow active, bottom nav 4+More | Sidebar tint-only active; Profile hidden in More; no theme toggle | Gap |
| **Content width** | `max-w-6xl` (1152px) | Desktop `maxWidth: 1280` | Gap |

---

## 2. Design differences (detailed)

### 2.1 Color & theme

- Connect uses **OKLCH** with `color-mix` for hover borders; Transport uses fixed **hex** values that approximate but do not track CSS updates automatically.
- Connect exposes **sidebar-* tokens** used for nav chrome; Transport reuses `card` / `darkCard` for sidebar.
- Connect **active nav item** uses solid `bg-primary text-primary-foreground shadow-glow`; Transport uses **12% primary tint** with colored text — visually softer, not matching.
- Connect mobile nav active: `text-primary` + icon wrapper `bg-primary/10`; Transport uses M3 `NavigationBar` indicator pill.

### 2.2 Typography

- Connect page titles scale: `text-xl sm:text-2xl md:text-3xl` with `font-display`.
- Transport `PageHeader` always uses `headlineSmall` (~24px) — no responsive scaling.
- Connect stat labels: `text-[10px] uppercase tracking-wide`; Transport uses `labelSmall` without uppercase.

### 2.3 Components

- Connect **`EmptyState`**: dashed `border-border`, `bg-muted/20`, icon in `size-14 rounded-2xl bg-primary/10`.
- Connect **`SectionCard`**: section wrapper with optional title/link row — no Transport equivalent.
- Connect **`StatCard`**: self-contained tone backgrounds on the card surface; Transport delegates to generic `LxCard`.

### 2.4 Motion

- Connect: 220ms `in-up` fade+translate on route change; hover transitions on cards; `prefers-reduced-motion` fallback.
- Transport: no route-level animation; card/button transitions default to Material.

### 2.5 Navigation patterns

| Connect | Transport issue |
|---------|-----------------|
| Unified glass **header** on all breakpoints with brand + actions | Mobile/tablet use separate `AppBar`; desktop uses plain `_TopBar` |
| Theme toggle in header | None — follows system only |
| Mobile: 4 primary + More sheet for overflow | 4 tabs declared but **Profile routed through More** (bug) |
| Teacher rail at `md–lg` | Tablet uses extended `NavigationRail` (acceptable) |
| Sidebar width `w-64` (256px) | 260px — negligible |

---

## 3. Missing shared components (vs Connect / `@lumenx/ui`)

| Connect / package | Transport status |
|-------------------|------------------|
| `Button` (link size variants) | Partial — `LxButton` missing link + sizes |
| `Badge` | Missing |
| `Avatar` | Missing |
| `Switch` | Uses raw Material `Switch` in profile |
| `Tabs` | Uses `SegmentedButton` / raw tabs |
| `Sheet` / bottom sheet styling | Default Material bottom sheet for More menu |
| `Command` / search dialog | Missing |
| `EmptyState` | `LxEmptyState` — different visual |
| `PageSkeleton` | Partial — `LxStatSkeletonGrid` only |
| `SectionCard` | Missing |
| Filter pill pattern | Missing — duplicated `_FilterChip` |
| `ConfirmDialog` (teacher) | Partial — `LxDialog` |
| `Toaster` / Sonner | Missing |
| `PortalMark` | Missing (bus icon wordmark only) |
| `GlobalSearch` | Stub only |
| Shared `LxErrorState` | Missing — duplicated per feature |
| `LxFilterBar` / `LxSearchField` | Missing |
| Component barrel export | Missing |

---

## 4. Responsiveness issues

| Issue | Location | Severity |
|-------|----------|----------|
| Inconsistent grid breakpoints (600 / 640 / 720) | Dashboard loading, stat grids, skeleton | Medium |
| Desktop content max-width **1280px** vs Connect **1152px** | `shell_scaffold.dart` | Low |
| No `clamp()` base font scaling | Flutter default 14px | Low |
| Mobile main content lacks bottom safe-area padding above nav | `_MobileShell` | Medium |
| `TripsPage` fixed 3-column grid (off-router) | `trips_page.dart` | Low (dead) |
| Attendance list height via `%` of screen | `attendance_page.dart` | Medium — fragile on small phones |
| Horizontal filter chips require wide test viewport | `notifications` tests | Info |
| Tablet uses `AppBar` + rail — double title with `PageHeader` | `_TabletShell` | Medium |

---

## 5. Navigation issues

| Issue | Detail |
|-------|--------|
| **Profile in More menu** | `kMobilePrimaryNavCount = 4` but `AppBottomNav` treats slot 4 as More — Profile unreachable from primary bar |
| **Dead search** | Desktop `_TopBar` search `onPressed: () {}` |
| **No theme toggle** | Connect exposes light/dark in header |
| **No unified header** | Mobile/tablet/desktop use different chrome — Connect uses one glass header |
| **Sidebar active style** | Does not match Connect `shadow-glow` filled primary |
| **Legacy route path helpers** | `RoutePaths.routeDetail()` etc. exist but routes not registered — confusing |
| **Title resolution** | Subpages (`/my-route`, `/profile/settings`) fall back to app name in top bar |

---

## 6. Architecture issues

| Issue | Detail |
|-------|--------|
| **No monorepo UI link** | Flutter app isolated from `packages/ui`; token drift inevitable |
| **Token access** | Direct `AppColors.*` + manual `isDark` checks vs `ThemeExtension` |
| **Component duplication** | 5× search bars, 5× filter bars, 7× loading views, 6× empty views, 7× error views |
| **Inconsistent async UX** | Most pages hand-roll `AsyncValue.when`; only `TripsPage` uses `FeatureAsyncBody` |
| **No design-system layer** | 8 `Lx*` widgets vs 49 in `@lumenx/ui` |
| **Off-router admin features** | Large dead UI surface area |
| **No widget catalog** | No Storybook / Widgetbook |
| **Theme mode** | `ThemeMode.system` only — no user override / persistence |
| **Session split** | Profile + attendance session sync works but lives in `core/session` without UI coupling docs |

---

## 7. Routed feature UI scorecard

| Feature | Header | Loading | Empty | Error | Filters | Connect parity |
|---------|--------|---------|-------|-------|---------|----------------|
| Driver Home | ✓ | Custom | Custom | Custom | — | Partial |
| Attendance | ✓ | Inline | Session gate | — | SegmentedButton | Partial |
| Notifications | ✓ | Custom | Custom | Custom | FilterChip | Gap |
| Profile | ✓ | Custom | Signed-out | Custom | — | Partial |
| My Route | Subheader | Reuses routes loader | Text only | — | — | Partial |

---

## 8. Recommendations (UI alignment phase)

1. Complete **theme tokens** + `ThemeExtension` for semantic colors and sidebar.
2. Add shared **LxFilterChip**, **LxEmptyState**, **LxErrorState**, **LxPageSkeleton**, **LxSectionCard** matching Connect.
3. Fix **mobile navigation** — 4 visible tabs, remove erroneous More menu.
4. Unify **shell header** with glass effect, theme toggle, Connect max-width.
5. Add **page enter animation** (`animate-in-up` equivalent).
6. Migrate routed features to shared empty/error/loading components.
7. Defer monorepo token package to architecture phase; document hex ↔ OKLCH mapping.

---

*Next: [TRANSPORT_UI_GAP_REPORT.md](./TRANSPORT_UI_GAP_REPORT.md) · [TRANSPORT_ARCHITECTURE_IMPROVEMENT_REPORT.md](./TRANSPORT_ARCHITECTURE_IMPROVEMENT_REPORT.md)*
