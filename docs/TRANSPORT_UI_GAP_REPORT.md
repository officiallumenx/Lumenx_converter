# LumenX Transport — UI Gap Report

> **Date:** 1 Jun 2026  
> **Reference:** LumenX Connect (`apps/connect`) + `@lumenx/ui`  
> **Goal:** Exact visual/interaction parity for shared patterns (Phase: UI alignment only)

---

## Priority legend

| Priority | Meaning |
|----------|---------|
| **P0** | Visible on every session / breaks Connect parity |
| **P1** | Visible on common driver flows |
| **P2** | Admin/off-router or edge cases |
| **P3** | Nice-to-have polish |

---

## 1. Theme system gaps

| Gap | Connect reference | Transport today | Priority | Alignment action |
|-----|-------------------|-----------------|----------|------------------|
| Incomplete color tokens | `styles.css` `:root` / `.dark` | 11 light + 6 dark colors | P0 | Expand `AppColors` + `LumenXTheme` extension |
| No sidebar tokens | `--sidebar`, `--sidebar-accent`… | Reuses card colors | P0 | Add sidebar colors to theme |
| No `primary-glow` usage | Active nav `shadow-glow` | Glow defined, unused in nav | P0 | Apply on sidebar active item |
| No accent / popover tokens | `--accent`, `--popover` | Missing | P1 | Add to theme for menus/dialogs |
| Card radius mismatch | `rounded-2xl` (24px) | `radiusLg` (16px) | P0 | Cards → `radius2xl` |
| Button radius mismatch | `rounded-md` (~12px) | `rounded-lg` (16px) | P1 | Button theme → `radiusMd` |
| Input radius | `rounded-xl` / h-11 selects | `radiusLg` | P1 | Inputs → `radiusMd` + min height 44 |
| No user theme toggle | `AppShell` Moon/Sun | `ThemeMode.system` only | P0 | Theme provider + header toggle |
| Hex vs OKLCH drift | Source of truth in CSS | Manual hex | P2 | Document mapping; sync values |

---

## 2. Component gaps

### 2.1 Must match Connect (P0–P1)

| Component | Connect spec | Gap | Fix |
|-----------|--------------|-----|-----|
| **EmptyState** | Dashed border, muted/20 bg, 56px primary/10 icon, Sora title, optional action | Plain icon + text | Rewrite `LxEmptyState` |
| **StatCard** | Tone bg on card, uppercase label, display value, reserved hint height | Compact layout, no uppercase | Update `LxStatCard` |
| **PageHeader** | Responsive Sora title, muted subtitle, action slot | Fixed size | Update `PageHeader` |
| **Filter pills** | `rounded-full px-3 py-1.5 text-xs`, active `bg-primary text-primary-foreground` | Material FilterChip | New `LxFilterChip` |
| **Card** | `surface-card` hover elevation | Static | `LxCard` hover + `radius2xl` |
| **PageSkeleton** | Title + subtitle + 4 stat blocks + row skeletons | Partial grid only | New `LxPageSkeleton` |
| **Error state** | Card + icon + retry (teacher pages) | Duplicated per feature | New `LxErrorState` |
| **SectionCard** | Titled section with optional link | Missing | New `LxSectionCard` |

### 2.2 Missing but lower priority (P2–P3)

| Component | Notes |
|-----------|-------|
| `Badge` | Used for counts, status chips in Connect |
| `Avatar` | Header user menu |
| `CommandDialog` / search | Driver app may not need global search in Phase 1 |
| `Toaster` | SnackBar substitute acceptable short-term |
| `PortalMark` | Branded role badge — Transport can use bus mark |
| `Switch` styling | Wrap Material switch with Connect spacing |
| `Tabs` | Align SegmentedButton styling to Connect tabs |

---

## 3. Navigation gaps

| Gap | Connect | Transport | Fix |
|-----|---------|-----------|-----|
| Mobile Profile tab | In primary or More sheet | Hidden behind More (bug) | Show all 4 destinations |
| Active sidebar item | `bg-primary text-primary-foreground shadow-glow` | Tint only | Filled primary + glow |
| Mobile active item | Icon `bg-primary/10`, `text-primary` | M3 indicator | Customize `NavigationBarTheme` |
| Glass header | `.glass` blur header | Opaque bars | `BackdropFilter` header |
| Content padding bottom | Space for fixed bottom nav | Default scaffold | Add `SafeArea` / padding |
| Subpage titles | Breadcrumb / back in header | Generic fallback title | Map sub-routes in `_titleForPath` |
| Theme toggle placement | Header desktop, menu mobile | None | IconButton in shell header |

---

## 4. Animation gaps

| Animation | Connect | Transport | Fix |
|-----------|---------|-----------|-----|
| Page enter | `animate-in-up` 220ms | None | `LxAnimatedPage` wrapper |
| Card hover | border + shadow transition 200ms | None | `MouseRegion` on `LxCard` |
| Button press | `active:scale-[0.97]` | Material splash only | Optional `ScaleTransition` on tap |
| Skeleton | Tailwind pulse | Custom lerp | Keep; align border radius to `radius2xl` |
| Reduced motion | CSS media query | None | Check `MediaQuery.disableAnimations` |

---

## 5. Feature-level UI gaps (driver routes only)

| Screen | Gap | Priority |
|--------|-----|----------|
| **Driver Home** | Quick action tiles not using Connect button variants; trips section not `SectionCard` | P1 |
| **Driver Home** | Empty trips uses custom card empty | P1 → `LxEmptyState` |
| **Driver Home** | Error view custom | P1 → `LxErrorState` |
| **Attendance** | SegmentedButton vs Connect tabs styling | P2 |
| **Attendance** | Signed-out gate not using `LxEmptyState` | P1 |
| **Notifications** | FilterChip vs pills | P0 |
| **Notifications** | Empty filtered state custom | P1 |
| **Profile** | Menu tiles not Connect `SettingsRow` pattern | P2 |
| **Profile** | Logout dialog actions layout | P2 |
| **My Route** | Stop list uses raw `ListTile` in card | P2 |

---

## 6. Responsiveness gaps

| Gap | Fix |
|-----|-----|
| Multiple breakpoints | Centralize in `Breakpoints` (`gridCompact`, `gridStandard`, `contentMaxWidth`) |
| `maxWidth: 1280` | Change to **1152** (`max-w-6xl`) |
| Double header on tablet | Hide shell `AppBar` title when `PageHeader` present, or remove duplicate |
| Filter horizontal scroll | Keep; ensure `LxFilterBar` wraps scroll view |

---

## 7. UI alignment implementation checklist

### Phase A — Foundation (this implementation)
- [x] Audit reports
- [ ] Complete theme tokens + `LumenXTheme`
- [ ] Theme mode toggle
- [ ] `LxCard`, `LxButton`, `PageHeader`, `LxStatCard` alignment
- [ ] `LxEmptyState`, `LxErrorState`, `LxFilterChip`, `LxPageSkeleton`, `LxSectionCard`
- [ ] Shell + navigation fixes
- [ ] `LxAnimatedPage` on shell content
- [ ] Migrate driver-route empty/error/filter views

### Phase B — Deferred (not business features, but out of scope now)
- [ ] Global search / Command palette
- [ ] Sonner-style toasts
- [ ] Avatar + header user menu
- [ ] Widgetbook catalog
- [ ] Admin module UI alignment (off-router)

---

## 8. Acceptance criteria (UI alignment done when)

1. Side-by-side with Connect (light + dark): cards, buttons, headers, stat cards, empty states, and filter pills are **visually indistinguishable** at equivalent breakpoints.
2. Mobile bottom nav shows **Home, Attendance, Notifications, Profile** without More menu.
3. Sidebar active item uses **filled primary + glow**.
4. Theme toggle switches light/dark like Connect.
5. Page content animates in with fade+up (respecting reduced motion).
6. All **routed** driver screens use shared `LxEmptyState` / `LxErrorState` / `LxPageSkeleton` where applicable.

---

*See also: [TRANSPORT_UI_AUDIT_REPORT.md](./TRANSPORT_UI_AUDIT_REPORT.md)*
