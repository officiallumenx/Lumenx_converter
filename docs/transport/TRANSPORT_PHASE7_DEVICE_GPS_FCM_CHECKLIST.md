# Phase 7 — Physical device GPS / FCM execution checklist

**Status:** No Android/`adb` available in prior audit. Steps **12, 16, 19, 27, 33** stay **BLOCKED** until this checklist has real evidence.

Product default arrival radius is **100 m** (Admin may override). Do not use browser Playwright geolocation as device evidence.

---

## A. Setup (once)

1. Install Transport + Connect against demo project `kmpzflsurepjwqnfqyld` / institute `lx-transport-pw` (`trial_active`).
2. Driver: Transport PIN login. Parent + linked student: Connect with FCM tokens registered. Admin: notifications on.
3. Confirm stop (and school, if testing 16/17) `notification_radius_m` is **100** or the intended Admin override.
4. Enable capture: device location permission dialogs, logcat / FCM delivery logs, server `notification` + outbox rows, screenshots/timestamps.

## B. Permissions & accuracy

- [ ] Transport requests / receives **precise location** + background location as required by the live trip path.
- [ ] Notifications permission granted on Transport and Connect.
- [ ] Record reported GPS accuracy (prefer ≤ 20–30 m for arrival tests).
- [ ] Network online; note if GPS is indoor/spoofed (document as non-road evidence).

## C. Live trip sequence (evidence by step)

| Step | Do this | Pass if |
|------|---------|---------|
| **12 / 27** | Start trip; approach stop so ETA bands / next-stop fire | Parent **and** student Connect push only (no staff/driver on approach); titles match next-stop copy |
| **13 / 28** | Enter stop geofence | Parent + student arrival push; distance ≤ configured radius (default **100 m**); outside radius does **not** fire |
| **16** | Finish pickups; enter school geofence | School-arrived path fires **once** |
| **17** | Same school enter | Parent “safely”; admin `{bus} reached school successfully`; student “Bus reached school” |
| **19 / 33** | End trip | Live GPS sharing stops immediately for parent, student, admin |

## D. Evidence pack (attach per run)

- [ ] Device model / OS / app builds  
- [ ] Trip id, stop id, school stop id, service date  
- [ ] Screenshots of pushes + live map before/after end trip  
- [ ] Server rows: notification kind, audience, recipients, dedupe keys, outbox delivery status  
- [ ] GPS samples around arrival (time, lat/lng, accuracy, distance to stop)

## E. Not acceptable as device PASS

- Playwright browser geolocation / notification grants  
- Unit tests alone (those only support code PASS for 13/28 defaults)  
- Fabricated GPS or mocked FCM success without tokens
