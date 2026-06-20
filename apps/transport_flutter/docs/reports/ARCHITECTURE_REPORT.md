# Architecture Report

## High-Level Structure
- Platform: Flutter (Material 3)
- State management: Riverpod (`Provider`, `StateProvider`, `NotifierProvider`, `AsyncNotifierProvider`)
- Routing: GoRouter with auth redirect guard
- Data: mock repositories for frontend-only behavior

## Layering Model
- `core/`
  - routing, shell layout, navigation scaffolding, theme, responsive utilities, session sync.
- `shared/`
  - reusable Connect-style components (`Lx*`), mock datasets, common models.
- `features/`
  - vertical feature modules (auth, dashboard, attendance, trip readiness, notifications, profile, SOS, parent visibility).

## State and Data Flow
- Auth session is the primary gate for protected routes.
- Feature controllers consume repository data and expose `AsyncValue` snapshots.
- UI reads provider state and renders explicit loading/error/empty/success branches.
- Offline queue managed via `core/offline/offline_sync.dart` and reflected globally in shell banners/snackbars.

## Navigation Architecture
- Top-level auth routes are outside shell.
- Driver functional routes are inside `ShellRoute` for consistent app chrome.
- Desktop/tablet/mobile navigation is unified by destination metadata (`navigation_destinations.dart`).
- Home maps to driver dashboard; profile has nested routes for settings/support/about/theme/edit.

## UX and Motion Architecture
- Route-level micro motion: `LxAnimatedPage`.
- State transition motion: `AnimatedSwitcher` and `AnimatedSize` in high-impact surfaces.
- Theme transitions use tuned animation curve/duration.
- Cross-platform page transitions configured for smooth consistency.

## Reliability and Maintainability Notes
- Analyzer is currently clean.
- Mock repositories keep deterministic demo behavior and simplify testability.
- Shared components centralize visual semantics and reduce design drift risk.

## Recommended Next Technical Steps
- Add golden tests for major page states (loading/empty/error/success) to lock UI parity.
- Add integration tests for cross-route flows (auth -> dashboard -> trip/attendance -> profile/logout).
- Introduce per-feature telemetry hooks (mocked now, production-ready API later).

