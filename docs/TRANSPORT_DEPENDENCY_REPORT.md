# Transport architecture — dependency report

**Date:** 2026-07-28  
**Scope:** Frontend only (localStorage ops bridge). No backend.

## Single source of truth

```
Admin (fleet + bus enrollments + route locks)
        │
        ▼
lumenx.transport.ops.v1   ← packages/utils/src/transport-ops-bridge.ts
        │
        ├──────────────► Driver (stops, attendance roster, lock)
        │                      │
        │                      └── writes stop assignments back to ops
        │
        └──────────────► Connect (Parent / Student / Teacher)
                              read-only projection via projectConnectTransport()
```

## Canonical IDs

| Entity | ID format | Examples |
|--------|-----------|----------|
| Student | `STU-*` | `STU-1042` Aarav Sharma |
| Vehicle | `VH-*` / number `BUS-*` | `VH-01` / `BUS-01` |
| Route | `RT-*` | `RT-01` North Campus Loop |
| Setup stop | `RST-*` | `RST-01` |
| Enrollment | `enr-*` | `enr-01` |
| Admin driver | `DR-*` | `DR-01` |
| Driver session | `drv-1042` → `DR-01` | mapped in bridge |

### Connect portal keys → student

| Portal | Student |
|--------|---------|
| `C1` / `S-2041` | `STU-1042` |
| `C2` / `S-2099` | `STU-1044` |
| `C3` / `S-2105` | `STU-1047` |

Shared directory: `CANONICAL_TRANSPORT_STUDENTS` in `@lumenx/utils`.

## Dependency graph (who depends on what)

| Consumer | Reads | Writes |
|----------|-------|--------|
| **Admin** `transport-store.ts` | Ops (dashboard counts, driver stop merge) | Fleet `lumenx.admin.transport.v2.*`, enrollments + locks → ops |
| **Admin** `TransportStudentsView` | Ops enrollments | `upsertBusEnrollment` / `deleteBusEnrollment` |
| **Driver** attendance | `enrollmentsForVehicle(VH-01)` | — |
| **Driver** route-setup | Ops locks + `CANONICAL_TRANSPORT_STUDENTS` | `syncDriverStopAssignment` |
| **Connect** `transport-store.ts` | `projectConnectTransport` / `enrollmentsForRoute` | ETA simulation only (local) |
| **Fees** | `RST-*` stop fee keys (aligned) | Separate (not ops) |

## Removed / demoted duplicates

| Former duplicate | Status |
|------------------|--------|
| Connect `TRANSPORT_ASSIGNMENTS`, `BUS_NCL`, `ROUTE_NCL_STOPS`, `routeStudentsMorning`, `teacherRouteOverview` | **Removed** — mock-data now chrome-only |
| Connect student IDs `S-*` as transport SoT | **Demoted** — portal keys only; ops uses `STU-*` |
| Driver `stu-*` directory / roster | **Replaced** with `STU-*` from `CANONICAL_TRANSPORT_STUDENTS` / ops |
| Bridge `syncDriverStopAssignment` dropping locks | **Fixed** — preserves `routeLocksByRoute` |

## Storage keys

| Key | Owner |
|-----|-------|
| `lumenx.transport.ops.v1` | **Shared SoT** |
| `lumenx.admin.transport.v2.{profile}` | Admin fleet |
| `lumenx.transport.route-setup.v1` | Driver device stops |
| `ues_transport_session` | Driver auth |

## Remaining legacy (non-SoT)

- Admin snapshot `assignments` (`AS-*`) — still seeded for older helpers; live student count prefers ops enrollments.
- Driver trip chrome (notifications, support) — local UX, not enrollment data.
- Connect ETA tick simulation — presentation only; assignment always from ops.

## Verify

1. Admin → Transport → Students: enroll on `BUS-01` → appears in Driver attendance.
2. Driver assigns stop → Admin route stops update; Connect parent/student pickup stop updates.
3. Parent child C1 shows `BUS-01` / `STU-1042` Aarav from ops (not Connect mock bus “Bus 12”).
