# Transport ETA — production notes

## What the engine computes

LumenX Transport ETA is **not** road-network ETA.

Remaining distance uses:

1. Bus position (last **trusted** GPS sample)
2. Ordered route stops (`route_order`)
3. **Haversine** legs: bus → nearest upcoming stop → … → learner destination stop

Speed uses GPS-reported / implied speed with smoothing and movement hysteresis
(`moving` / `slow` / `stopped` / `gps_stale` / `gps_uncertain`).

Source of truth: `backend/src/domains/transport/eta-engine.ts`.

## What it does **not** do

- Map-matching onto roads
- Turn-by-turn / one-way / bridge awareness
- Traffic or road-closure delay
- Off-route / wrong-sequence detection for the driver path
- Paid external routing (Google, OSRM, Mapbox, etc.) — **not integrated**

There is **no** stored route polyline / road geometry in the transport schema today.

## GPS freshness (UI bands)

Canonical bands (`packages/utils` + backend mirror):

| Band    | Age        |
|---------|------------|
| live    | ≤ 45s      |
| recent  | ≤ 120s     |
| stale   | ≤ 10 min   |
| offline | older / none |

ETA engine treats location as stale for confidence at **90s** (`staleLocationMs`).
UI map pins only show when freshness is `live` or `recent`.

Stale GPS must **not** be labeled as live location.

## Stopped bus

When effective speed is near zero / `movementState === stopped` and the bus is
still far from the stop, ETA **holds** the last estimate and `displayMode` is
`stopped`. Product copy should say the bus may be stopped — not pretend continuous
travel at a floored 3 km/h.

## GPS jumps

Implied speed &gt; 120 km/h over &gt; 80 m is rejected. Rejected jumps must not
overwrite the latest persisted vehicle location or shrink parent ETA distance.

## Parent boarding vs school arrival

School geofence / `school_arrived_at` / trip phase `boarding` do **not** board
students. Only `transport_boarding_event` (driver boarding) is authoritative for
“Picked up”.

## Safer future architecture (requires approval)

If road ETA is required later:

1. Persist route geometry (polyline) or call an approved routing provider
2. Map-match GPS → remaining **road** distance
3. Estimate travel time with traffic (optional)
4. Publish confidence + display mode unchanged

Do **not** add a paid routing provider without explicit product approval.
