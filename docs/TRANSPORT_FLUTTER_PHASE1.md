# LumenX Transport — Phase 1 Architecture Report

> **Scope:** Foundation only — no business features.  
> **Location:** `apps/transport_flutter/`  
> **Stack:** Flutter 3.x · Dart 3.x · go_router · Riverpod · google_fonts

---

## 1. Architecture Overview

Phase 1 establishes a **feature-first, layered architecture** aligned with LumenX Connect design language.

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                         │
│  features/*/presentation/*_page.dart                    │
│  shared/components/*  ·  core/widgets/*                 │
├─────────────────────────────────────────────────────────┤
│                    Application                          │
│  core/routing/*  ·  Riverpod providers (repositories)   │
├─────────────────────────────────────────────────────────┤
│                    Domain / Data                        │
│  shared/models/*  ·  shared/repositories/*              │
│  shared/mock_data/*  (Phase 1 — swapped for API later)  │
└─────────────────────────────────────────────────────────┘
```

### Principles

| Principle | Implementation |
|-----------|----------------|
| Feature isolation | Each nav destination lives under `features/<name>/` |
| Single shell | `ShellScaffold` owns responsive navigation |
| Design tokens | `core/theme/` mirrors LumenX Connect CSS variables |
| Data abstraction | Repositories expose async APIs; mock layer is swappable |
| No business logic | Pages show scaffold + sample data only |

---

## 2. Folder Structure

```
apps/transport_flutter/lib/
├── main.dart
├── app.dart
│
├── core/
│   ├── routing/
│   │   ├── route_paths.dart          # Path constants
│   │   ├── app_router.dart           # go_router config + shell
│   │   └── navigation_destinations.dart
│   ├── theme/
│   │   ├── app_colors.dart           # LumenX Connect palette
│   │   ├── app_typography.dart       # Inter + Sora
│   │   ├── app_spacing.dart
│   │   ├── app_shadows.dart
│   │   └── app_theme.dart            # ThemeData light/dark
│   ├── constants/
│   │   ├── app_constants.dart
│   │   └── breakpoints.dart
│   ├── widgets/
│   │   ├── shell_scaffold.dart       # Responsive nav shell
│   │   ├── app_bottom_nav.dart
│   │   ├── app_navigation_rail.dart
│   │   ├── app_sidebar.dart        # Fixed desktop sidebar
│   │   └── page_header.dart
│   └── utils/
│       └── responsive.dart
│
├── shared/
│   ├── models/                       # Domain entities
│   ├── repositories/                 # Data access contracts
│   ├── mock_data/                    # Demo datasets
│   └── components/                   # Lx* design system widgets
│
└── features/
    ├── dashboard/presentation/
    ├── routes/presentation/
    ├── students/presentation/
    ├── attendance/presentation/
    ├── vehicles/presentation/
    ├── drivers/presentation/
    ├── trips/presentation/
    ├── notifications/presentation/
    └── profile/presentation/
```

---

## 3. Routing Plan

**Router:** `go_router` with a single `ShellRoute` wrapping all authenticated destinations.

| Path | Feature | Page title |
|------|---------|------------|
| `/` | dashboard | Dashboard |
| `/routes` | routes | Routes |
| `/students` | students | Students |
| `/attendance` | attendance | Attendance |
| `/vehicles` | vehicles | Vehicles |
| `/drivers` | drivers | Drivers |
| `/trips` | trips | Trips |
| `/notifications` | notifications | Notifications |
| `/profile` | profile | Profile |

### Navigation behaviour

- **Mobile (<600px):** Bottom `NavigationBar` — primary 5 tabs + overflow menu for remaining
- **Tablet (600–1023px):** `NavigationRail` (extended labels)
- **Desktop (≥1024px):** Fixed 260px sidebar; **only content area scrolls**

Deep linking and browser back are supported via `go_router`. Page titles follow LumenX convention: `{Page} — LumenX Transport`.

---

## 4. Mock Data Plan

All data lives in `shared/mock_data/` and is consumed through repositories.

| Entity | Count | Sample values |
|--------|-------|---------------|
| **Routes** | 3 | Route 01, Route 02, Route 03 |
| **Vehicles** | 3 | AP16AB1234, AP16AB5678, AP16AB9012 |
| **Drivers** | 2 (+1 backup) | Ramesh Kumar, Suresh Babu |
| **Students** | 75 | Assigned across routes, Class 6–12 |
| **Attendance** | ~500 records | Last 14 school days, present/absent/leave |
| **Trips** | 12 | completed · in_progress · scheduled |
| **Notifications** | 8 | Trip alerts, maintenance, attendance |
| **Profile** | 1 | Transport coordinator demo user |

### Repository API (Phase 1)

Each repository exposes:

- `Future<List<T>> getAll()` — full list
- `Future<T?> getById(String id)` — single item
- Feature-specific aggregations (e.g. `DashboardRepository.getSummary()`)

Phase 2 will replace mock implementations with API clients without changing page contracts.

---

## 5. Design System (LumenX Connect parity)

| Token | Source |
|-------|--------|
| Colors | `apps/connect/src/styles.css` oklch → Flutter `Color` |
| Typography | Inter (body) + Sora (headings) via `google_fonts` |
| Radius | 16px base (`--radius: 1rem`) |
| Shadows | soft / elevated / glow |
| Components | LxCard, LxButton, LxDialog, LxTextField, LxDataTable, LxSkeleton |

---

## 6. Phase 1 Exit Criteria

- [x] App launches with responsive shell on mobile, tablet, desktop
- [x] All 9 nav destinations render placeholder pages
- [x] Design system components available in `shared/components/`
- [x] Mock repositories return realistic demo data
- [x] `flutter analyze` passes
- [ ] Business workflows (trip dispatch, GPS, offline) — **Phase 2+**

---

## 7. Run

```bash
cd apps/transport_flutter
flutter pub get
flutter run
```
