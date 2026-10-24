# LumenX Transport — Phase 7: Full 34-Step End-to-End Acceptance Audit

**Updated:** 2026-10-15 (owner decision: **100 m default geofence**)  
**Canonical workflow source:** Owner-provided 34-step wording (preserved in §0).  
**Final verdict:** **BLOCKED** (not VERIFIED) — radius decision implemented; physical GPS/FCM still outstanding

---

## Executive result (this session)

| Metric | Result |
|--------|--------|
| PASS | **29** / 34 |
| FAIL | **0** |
| BLOCKED | **5** — steps **12**, **16**, **19**, **27**, **33** (physical GPS/FCM) |
| Owner geofence decision | **Confirmed: default arrival radius = 100 m** (still Admin-configurable) |
| Playwright workflow | **6 / 6 PASS** (re-run after 100 m default change) |
| Geofence / transport unit | Backend **68** relevant tests PASS; Admin radius/map **12** PASS |
| Device GPS / FCM | **NOT AVAILABLE** — see device checklist |

**Do not claim VERIFIED.**

---

## Owner decision — 100 m default (recorded)

| Item | Detail |
|------|--------|
| Decision | Use **100 m** as the product **default** geofence for arrival acceptance (steps 13 / 28) |
| Editable overrides | **Preserved** — Admin / per-stop / school radius remain configurable within 20–5000 m |
| Existing stored values | **Not rewritten** — rows already saved as 150 m (or other) keep their explicit value until edited |
| DB column DEFAULT | Historical migrations still say **150** for brand-new SQL inserts that omit the column. **App API paths always set an explicit radius** (settings default or `STOP_RADIUS_DEFAULT_M=100`). No migration applied this session — proposed additive `ALTER … SET DEFAULT 100` only (no row rewrites); see pre-device audit |

---

## 0. Canonical 34-step checklist (owner wording, preserved)

| # | Original description (owner) |
|---|------------------------------|
| 1 | admin assign students |
| 2 | driver assign the stop or select the existing stop |
| 3 | updated to admin. admin have two options they are (approve and reject), until the admin approve or approved works normally when the admin rejects then in driver app the student is shown in gray and on that rejected text. |
| 4 | the route is setup completely. |
| 5 | when the driver ones the app. in home show the first start trip and bust details and driver name and details. |
| 6 | when click on start trip navigate to attendance module. |
| 7 | the driver first select pick up trip. |
| 8 | after select the trip type ask for the permissions and check list to start(gps, internet, notifications etc). |
| 9 | after the checklist successful, confirm start trip. |
| 10 | after start the trip(updated to admin, parents and students, bus is started notification). |
| 11 | driver see the order wise students pickup |
| 12 | before 10 mins to arrive to there children or there stop notify to parents and students only (bus is 10 mins away). (or)to make that easy instead of using time we say next is your stop only or next is your children stop be ready. |
| 13 | after when the bus arrived the location lower then 100 meters the notify again bus arrived at pickup stop for parents and students of there children or there stop. |
| 14 | when the driver arrived the stop, who boarded the bus mark the attendance. |
| 15 | after student marked immediately the notification for parent(your children picked up safely) for students(you marked as picked up) for parents and students. |
| 16 | after the driver completed all the picked up stopes arriving the school stop. |
| 17 | when the bus arrived the school location with in the radius set by the admin can notify that children reached school safely to parents, for admin busname reached school successfully, for students bus reached school. |
| 18 | driver end the trip. |
| 19 | when the driver ends the trip the gps sharing can stop immediately for parents, students, and admin. |
| 20 | when the driver ones the app. in home show the first start trip and bust details and driver name and details. *(evening repeat)* |
| 21 | when click on start trip navigate to attendance module. |
| 22 | the driver first select drop trip. |
| 23 | after select the trip type ask for the permissions and check list to start(gps, internet, notifications etc). |
| 24 | after the checklist successful, confirm start trip. |
| 25 | after start the trip(updated to admin, parents and students, bus is started notification). |
| 26 | driver see the order wise students drops |
| 27 | before 10 mins … (or) next is your stop… parents and students only. |
| 28 | within 100 meters … bus arrived at drop stop for parents and students… |
| 29 | when the driver arrived the stop, who dropped … mark the attendance. |
| 30 | after student marked immediately … parent dropped safely; students marked as dropped … |
| 31 | after the driver completed all the drop stopes. |
| 32 | driver end the trip. |
| 33 | when the driver ends the trip the gps sharing can stop immediately… |
| 34 | after end trip the admin only notifies busname successfully dropped all students. |

---

## B. Implementation — 100 m default

| Location | Change |
|----------|--------|
| `backend/.../stop-radius.ts` | `STOP_RADIUS_DEFAULT_M = 100` |
| `apps/transport/.../stop-radius.ts` | Same constant |
| `apps/admin/.../stop-radius.ts` | Same constant |
| `TransportSettingsView.tsx` | UI defaults 100 / 100 |
| `repository.ts` / `service.ts` / `map.ts` / `transport-store.ts` | Fallbacks / empty settings use `STOP_RADIUS_DEFAULT_M` |
| `approach.ts` | Already used constant → missing/invalid radius → **100** |

Explicit per-stop / school radii unchanged. Authz / RLS / subscription / notify rules unchanged.

---

## C. Validation evidence

### Unit (A) — geofence

```text
cd backend && npx vitest run src/domains/transport/stop-radius.test.ts \
  src/domains/transport/approach.test.ts \
  src/domains/transport/ops-notifications-audience.test.ts \
  tests/transport.test.ts tests/transport-geo.test.ts
→ 68 passed / 68

# Covers: missing → 100; boundary ≤100 accept / 101 reject; explicit 150 preserved; student notify suite still green
```

```text
cd apps/admin && npx vitest run src/lib/transport/stop-radius.test.ts \
  src/lib/transport/map.test.ts src/lib/transport/settings-view.test.ts
→ 12 passed / 12
```

### Live browser (L)

```text
npx playwright test --project=transport-workflow
→ 6 passed / 6
```

### Physical device (D)

**Not run.** Checklist: `docs/transport/TRANSPORT_PHASE7_DEVICE_GPS_FCM_CHECKLIST.md`

---

## D. Per-step outcomes

Evidence key: **A**=automated · **L**=live browser · **P**=API · **D**=device · **C**=code

| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1 | **PASS** | L | Admin assign UI |
| 2 | **PASS** | L | Driver submit stop |
| 3 | **PASS** | L | Approve / decline / Declined |
| 4 | **PASS** | L | Route configured |
| 5 | **PASS** | L | Home Start Pickup |
| 6 | **PASS** | L | → attendance |
| 7 | **PASS** | L | Pickup |
| 8 | **PASS** | L | Checklist (browser grants) |
| 9 | **PASS** | L | Confirm start |
| 10 | **PASS** | A+C | Parent + student + admin + driver |
| 11 | **PASS** | L | Boarding roster |
| 12 | **BLOCKED** | C+A | Audience ready; **needs device GPS** to fire approach |
| 13 | **PASS** | A+C | Default **100 m**; `distanceM <= radius`; parent+student arrival emit. **Live GPS fire not device-proven** (same class as 12) |
| 14 | **PASS** | L | Mark boarded |
| 15 | **PASS** | A+C | Parent + student boarded copy |
| 16 | **BLOCKED** | — | School arrive needs **device GPS** |
| 17 | **PASS** | A+C | Parent/admin/student school copies |
| 18 | **PASS** | L | End pickup |
| 19 | **BLOCKED** | — | GPS share stop needs **device** |
| 20 | **PASS** | L | Start Drop |
| 21 | **PASS** | L | → attendance |
| 22 | **PASS** | L | Drop |
| 23 | **PASS** | L | Checklist |
| 24 | **PASS** | L | Confirm Drop |
| 25 | **PASS** | A+C | Same as 10 |
| 26 | **PASS** | L | Drop roster |
| 27 | **BLOCKED** | C+A | Same as 12 |
| 28 | **PASS** | A+C | Same as 13 (default 100 m + audience) |
| 29 | **PASS** | L | Mark dropped |
| 30 | **PASS** | A+C | Parent + student dropped |
| 31 | **PASS** | L | Day complete |
| 32 | **PASS** | L | End drop |
| 33 | **BLOCKED** | — | Same as 19 |
| 34 | **PASS** | A | Evening admin-only bus dropped-all |

---

## Remaining for VERIFIED

1. Physical device GPS/FCM per checklist → clear **12, 16, 19, 27, 33**.  
2. Optional: confirm live arrival notify on device within default **100 m** (supports 13/28 beyond unit evidence).  

### Proposed DB default alignment (not applied)

Smallest additive migration (column defaults only — **no** `UPDATE` of existing rows):

```sql
ALTER TABLE public.stop
  ALTER COLUMN notification_radius_m SET DEFAULT 100;
ALTER TABLE public.transport_settings
  ALTER COLUMN default_notification_radius_m SET DEFAULT 100;
ALTER TABLE public.transport_settings
  ALTER COLUMN school_notification_radius_m SET DEFAULT 100;
```

**Impact:** Only affects inserts that omit the radius column (raw SQL / tools). Supported API create paths already write an explicit value. Existing stops/settings retain stored radii (including historical 150).

---

**End state:** **BLOCKED** — **29 PASS / 0 FAIL / 5 BLOCKED**; not VERIFIED; no commit/push.
