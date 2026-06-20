# LumenX Transport — Driver App Conversion Report

> **Date:** 1 Jun 2026  
> **Scope:** Phase 1 only — convert existing `apps/transport_flutter` in place (no rebuild, no new app)  
> **Context:** Transport **management** lives in **LumenX Admin**. **LumenX Transport** is **driver-only**.

---

## Current state (before conversion)

The app was built as a **Transport Coordinator** operations console:

- 9 nav destinations (Dashboard, Routes, Students, Attendance, Vehicles, Drivers, Trips, Notifications, Profile)
- Fleet-wide dashboard (start/end trips, active drivers/vehicles, all routes)
- Full CRUD-style list/detail modules for routes, students, vehicles, drivers
- Profile persona: **Priya Sharma**, Transport Coordinator
- Attendance had a **separate** driver login picker, disconnected from profile

---

## Target state (after conversion)

**Single persona:** School bus **driver** (demo: **Ramesh Kumar**, Route 01)

**4 nav destinations:**

| Tab | Purpose |
|-----|---------|
| **Home** | Driver dashboard — my route, my trips today, quick actions |
| **Attendance** | Mark present, submit, history, summary (core workflow) |
| **Notifications** | Driver-relevant alerts only |
| **Profile** | Driver account, settings, support, logout |

---

## 1. Features to REMOVE

Removed from **navigation, router, and driver UI** (module code may remain on disk for Phase 2 reference but is unreachable):

| Feature | Reason |
|---------|--------|
| **Routes list & search/filters** | Route planning managed in LumenX Admin |
| **Route directory (all campus routes)** | Coordinator workflow |
| **Students list & profiles** | Enrollment managed in Admin |
| **Vehicles fleet registry** | Fleet management in Admin |
| **Drivers roster** | HR/roster in Admin |
| **Trips fleet log** | Dispatch oversight in Admin |
| **Coordinator dashboard stats** | Active vehicles, active drivers, fleet absent counts |
| **Start Trip / End Trip dispatch** | Coordinator dispatches trips in Admin |
| **View all routes quick action** | Replaced by read-only **My Route** |
| **Driver login picker (Attendance)** | Redundant — driver signs in via Profile |
| **Attendance tab logout** | Single logout in Profile |
| **Coordinator profile (Priya Sharma)** | Wrong persona |
| **Mobile “More” overflow menu** | Only 4 tabs needed |

---

## 2. Features to KEEP

| Feature | Driver use |
|---------|------------|
| **Attendance — Mark** | Tap students present, mark all, reset, submit |
| **Attendance — History** | Past submissions for assigned route |
| **Attendance — Summary** | Today stats, edit attendance |
| **Notifications inbox** | Route, attendance, vehicle, transport alerts |
| **Notification filters & mark read** | Unchanged interaction model |
| **Profile sub-pages** | Edit profile, notification settings, support, about |
| **Responsive shell** | Bottom nav / rail / sidebar (trimmed to 4 items) |
| **Design system (`Lx*`)** | Unchanged |
| **Mock data layer** | Reused; filtered for current driver |
| **Phase 1 architecture** | Feature-first, Riverpod, go_router |

---

## 3. Features to MODIFY

| Feature | Change |
|---------|--------|
| **Dashboard → Driver Home** | My route/vehicle, my trips today, route student count, attendance status; actions: Mark Attendance, My Route, Notifications |
| **Profile** | Driver persona (Ramesh Kumar, DR-01, Route 01); login/logout drives app session |
| **Attendance** | Auto-bind to logged-in driver; prompt sign-in if logged out |
| **Notifications** | Filter to alerts relevant to driver's assigned route |
| **App constants & copy** | Driver-centric titles and subtitles |
| **Navigation** | 4 destinations: Home, Attendance, Notifications, Profile |
| **Router** | Remove management routes; add `/my-route` read-only detail |
| **Default session** | Demo driver signed in on launch |
| **Support FAQs** | Driver-focused help content |
| **Tests** | Replace coordinator tests with driver home / session tests |

---

## Implementation checklist

- [x] This report
- [ ] `navigation_destinations.dart` — 4 driver tabs
- [ ] `route_paths.dart` + `app_router.dart` — driver routes only
- [ ] `app_constants.dart` + `mock_profile.dart` — driver persona
- [ ] Dashboard repository/snapshot/widgets — driver home
- [ ] `my_route_page.dart` — read-only assigned route
- [ ] Attendance — remove login picker; sync with profile session
- [ ] Profile — login/logout syncs attendance session
- [ ] Notifications — route-scoped filter
- [ ] Update tests; remove management module tests
- [ ] README note pointing to this report

---

## Out of scope (Phase 1)

- Real auth / API
- GPS / maps
- Multi-driver switcher (demo uses Ramesh Kumar)
- Deleting unused feature folders (kept for reference)
- LumenX Admin changes
