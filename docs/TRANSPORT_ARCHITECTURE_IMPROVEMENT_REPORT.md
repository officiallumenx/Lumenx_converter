# LumenX Transport — Architecture Improvement Report

> **Date:** 1 Jun 2026  
> **Scope:** `apps/transport_flutter` structural improvements (UI alignment phase + future)  
> **Constraint:** No new business features in current phase

---

## 1. Current architecture

```
apps/transport_flutter/
├── lib/
│   ├── app.dart                    # MaterialApp.router
│   ├── core/
│   │   ├── constants/              # AppConstants, breakpoints
│   │   ├── routing/                # go_router, nav destinations
│   │   ├── session/                # Driver session sync
│   │   ├── theme/                  # Colors, typography, theme (manual Connect port)
│   │   ├── utils/                  # responsive helpers
│   │   └── widgets/                # Shell, PageHeader, navigation
│   ├── features/                   # Feature-first modules
│   │   ├── dashboard/              # Driver home (routed)
│   │   ├── attendance/             # Routed
│   │   ├── notifications/          # Routed
│   │   ├── profile/                # Routed
│   │   └── {routes,students,...}/  # Off-router admin UI (legacy)
│   └── shared/
│       ├── components/             # 8 Lx* widgets
│       ├── mock_data/
│       └── models/
└── test/                           # Widget tests per feature
```

**Stack:** Flutter 3 · Riverpod · go_router · google_fonts · intl  
**Monorepo:** No dependency on `packages/ui`, `packages/module-transport`, or shared design tokens.

---

## 2. Strengths

| Strength | Detail |
|----------|--------|
| Feature-first layout | Clear separation presentation / data / models |
| Router shell pattern | Single `ShellRoute` matches Connect `AppShell` concept |
| Responsive tiers | mobile / tablet / desktop via `layoutTierOf` |
| Driver session unification | `syncDriverAttendanceSession` ties profile → attendance |
| Mock repository pattern | Phase 1 appropriate; mirrors Connect demo data approach |
| Theme port started | Inter + Sora, primary purple, spacing scale documented |

---

## 3. Architecture issues & recommendations

### 3.1 Design system isolation (Critical)

**Issue:** Connect uses `@lumenx/ui` + CSS tokens; Transport maintains a parallel Flutter implementation. Any Connect theme change requires manual Flutter updates.

**Recommendations:**

| Horizon | Action |
|---------|--------|
| **Short** | Add `LumenXTheme` `ThemeExtension` as single access point for semantic colors, shadows, radii |
| **Medium** | Create `packages/design-tokens` (JSON: OKLCH values from `styles.css`) consumed by Flutter code gen |
| **Long** | Optional `packages/ui-flutter` mirroring `@lumenx/ui` component APIs |

### 3.2 Component layer too thin (High)

**Issue:** Only 8 shared widgets; features duplicate search bars, filter bars, loading/error/empty views.

**Recommendations:**

1. Expand `lib/shared/components/` to cover Connect composites:
   - `LxFilterChip`, `LxFilterBar`, `LxSearchField`
   - `LxEmptyState`, `LxErrorState`, `LxPageSkeleton`
   - `LxSectionCard`, `LxBadge` (future)
2. Add `components.dart` barrel export.
3. Standardize on `FeatureAsyncBody` or a new `LxAsyncPageBody` for all async pages.

### 3.3 Dead admin UI surface (High)

**Issue:** Routes, students, drivers, vehicles, trips modules (~40+ files) are unreachable after driver conversion but still compiled and tested previously.

**Recommendations:**

| Option | Tradeoff |
|--------|----------|
| **A. Delete** | Cleanest; loses reference implementations |
| **B. Move to `lib/legacy/`** | Keeps code, excludes from primary docs |
| **C. Keep, document as archived** | Current state; analyzer still checks paths |

**Recommendation:** Option B in Phase 2; for UI alignment, do not refactor admin modules.

### 3.4 Inconsistent async UI pattern (Medium)

**Issue:** Each feature implements its own `*LoadingView`, `*ErrorView`, `*EmptyView`.

**Recommendation:**

```dart
LxAsyncPageBody<T>(
  value: asyncValue,
  onRetry: refresh,
  loading: () => const LxPageSkeleton(),
  empty: (ctx) => LxEmptyState(...),
  error: (msg, retry) => LxErrorState(message: msg, onRetry: retry),
  data: (data) => ...,
)
```

Migrate routed features first; leave admin modules.

### 3.5 Theme mode not user-controlled (Medium)

**Issue:** Connect persists `light | dark` in localStorage; Transport follows system only.

**Recommendation:** `themeModeProvider` (Riverpod) + optional `shared_preferences` persistence. Expose toggle in shell header (UI alignment task).

### 3.6 Navigation architecture (Medium)

**Issues:**
- `AppBottomNav` More-menu logic contradicts `kMobilePrimaryNavCount = 4`
- `_titleForPath` incomplete for nested profile routes
- Desktop search stub

**Recommendations:**
1. Simplify `AppBottomNav` — map 1:1 to `kNavDestinations`.
2. Extend `_titleForPath` with sub-route map.
3. Remove or hide search until Command-style search is scoped.

### 3.7 Breakpoint fragmentation (Low)

**Issue:** 600, 640, 720 used ad hoc.

**Recommendation:** Centralize in `breakpoints.dart`:

```dart
static const gridCompact = 600;
static const gridComfortable = 720;
static const contentMaxWidth = 1152; // max-w-6xl
```

### 3.8 Testing architecture (Low)

**Issue:** Widget tests per feature; management tests removed; no golden tests for design system.

**Recommendation:** Add `test/design_system/` golden tests for `LxCard`, `LxEmptyState`, `LxFilterChip` in light/dark after alignment.

### 3.9 Session & state (Low — working)

**Issue:** `syncDriverAttendanceSession(ProviderContainer)` is correct but unconventional vs `Ref`.

**Recommendation:** Keep `ProviderContainer` parameter; document in `core/session/README` (optional).

---

## 4. Proposed target architecture (UI layer)

```
lib/
├── core/
│   ├── theme/
│   │   ├── app_colors.dart
│   │   ├── app_theme.dart
│   │   └── lx_theme_extension.dart    # NEW — semantic tokens
│   └── widgets/
│       ├── shell_scaffold.dart        # Unified glass header
│       └── app_navigation.dart        # Connect-parity nav chrome
├── shared/
│   └── components/
│       ├── components.dart            # Barrel
│       ├── lx_*.dart                  # Expanded set
│       └── patterns/
│           └── lx_async_page_body.dart
└── features/
    └── */presentation/
        └── pages using shared patterns only
```

---

## 5. Cross-app alignment matrix

| Concern | Connect | Admin | Transport (target) |
|---------|---------|-------|-------------------|
| Primitives | `@lumenx/ui` | `@lumenx/ui-admin` | `Lx*` Flutter set |
| Tokens | `styles.css` | Admin CSS | `AppColors` + extension → design-tokens JSON |
| Shell | `AppShell.tsx` | Admin shell | `ShellScaffold` |
| Empty state | `EmptyState.tsx` | Similar | `LxEmptyState` |
| Feature modules | Route files | Route files | `features/*` |

---

## 6. Implementation phases

| Phase | Focus | Business logic |
|-------|-------|----------------|
| **UI alignment (now)** | Theme, components, shell, driver-route views | None |
| **Phase 2** | API auth, real data, GPS | Yes |
| **Phase 3** | Shared token package, legacy cleanup | Refactor only |

---

## 7. Risks if architecture debt is not addressed

1. **Visual drift** — Connect redesigns won't propagate to Transport.
2. **Duplicate maintenance** — Every new filter/search pattern copied N times.
3. **Onboarding cost** — Contributors must learn Transport-specific patterns vs monorepo conventions.
4. **Bundle / compile cost** — Dead admin UI still analyzed and maintained.

---

## 8. Immediate actions (UI alignment phase)

1. Introduce `LumenXTheme` extension + theme toggle provider.
2. Expand shared components per UI Gap Report.
3. Fix navigation bug (Profile in More).
4. Migrate driver-route pages to shared empty/error/skeleton/filter components.
5. Add component barrel export.
6. Update `apps/transport_flutter/README.md` with link to these three reports.

**Explicitly out of scope:** API integration, new driver features, admin module routing, global search, maps.

---

*See also: [TRANSPORT_UI_AUDIT_REPORT.md](./TRANSPORT_UI_AUDIT_REPORT.md) · [TRANSPORT_UI_GAP_REPORT.md](./TRANSPORT_UI_GAP_REPORT.md)*
