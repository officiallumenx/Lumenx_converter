# LumenX Connect — First-Load, Cache Persistence & Reload Performance

**Date:** 2026-10-23  
**Scope:** `apps/connect` automated inspection + Vitest coverage  
**Final status:** `PARTIAL — CODE TESTS PASSED, DEVICE PERFORMANCE NOT VERIFIED`

---

## 1. Executive summary

Connect already implements a deliberate warm-reload architecture:

- **TanStack Query** with long `staleTime` (30m), long `gcTime` (24h), `networkMode: "offlineFirst"`, `refetchOnWindowFocus: false`.
- **IndexedDB persistence** via `@tanstack/react-query-persist-client` + `idb-keyval`, **scoped per authenticated user**.
- Portal registries gate fetches with `useConnectQueryRestoring()` so Home does not race an empty memory cache during IDB hydrate.
- UI portals use **`isLoading && !data`** (not raw `isLoading`) so background refresh does not blank the screen when cache exists.
- Logout / 401 clears in-memory QueryClient + all persisted Connect IDB buckets + linked-children localStorage.

Automated tests (including a new cold/warm/offline/auth suite) **all passed**. No product-code defect requiring a fix was found in this pass. **Device / Capacitor cold-start timings were not measured** (Node Vitest only).

**Conclusion (section 10):** Yes — for stable portal/module data that is dehydrated, Connect is designed to reopen from cache without a full-screen reload of everything. Volatile surfaces (inbox, messages, live transport) always refetch by design.

---

## 2. Existing caching and persistence mechanisms

| Layer | Mechanism | Location |
|-------|-----------|----------|
| Framework | React 19 + Vite + TanStack Router/Start + Capacitor Android | `apps/connect` |
| Server state | `@tanstack/react-query` | `src/lib/connect-queries/query-client.ts` |
| Disk persist | `PersistQueryClientProvider` → IndexedDB (`idb-keyval`) | `PersistProvider.tsx`, `persist.ts` |
| Persist key | `lumenx-connect-rq-v{buster}:{userId}` | `connectPersistStorageKey` |
| Session UI | `localStorage` via `CONNECT_STORAGE_KEYS` | `app-state.tsx`, `@lumenx/auth` |
| Parent children shell | `lumenx-connect-linked-children-v1:{user}:{institute}` | `linked-children-cache.ts` |
| Auth tokens | Supabase session (not RQ cache); UI profile JSON in localStorage | `api-auth.ts`, `app-state.tsx` |
| Explicit non-persist | inbox, messages, transport (+ keys containing token/password/otp/secret/live) | `shouldDehydrateConnectQuery` |
| Sanitization | Signed photo URLs nulled before IDB write/read | `sanitize-persisted.ts` |

**Query defaults (verified):**

- `staleTime` = 30 minutes  
- `gcTime` = 24 hours  
- `persist maxAge` = 7 days  
- `cache buster` = 3  
- `refetchOnMount: true` (only when stale)  
- `refetchOnWindowFocus: false`  
- `refetchOnReconnect: true`  
- `networkMode: "offlineFirst"`

**Not found:** Service Worker offline shell, Capacitor Preferences for RQ, Secure Storage for query payloads.

---

## 3. Cold-start versus warm-start (code behaviour)

| Scenario | Expected behaviour (from code) | Automated result |
|----------|--------------------------------|------------------|
| Cold start (empty RQ + empty IDB) | Network fetch required; full-screen portal skeleton until first success | PASS — fetch count 1; loading gate true until data |
| Warm start (fresh in-memory) | No second fetch within `staleTime` | PASS — fetch count stayed 1 |
| Warm start after process restart | IDB restore → hydrate → no fetch while fresh | PASS — persist/restore roundtrip; fetch count 0 |
| Warm UI with data + background refresh | No full-screen block (`isLoading && !data`) | PASS — gate helper asserts false when `hasData` |

---

## 4. Render / load timings and API request counts

**Measured in this environment (Node Vitest only):**

| Metric | Value | Notes |
|--------|-------|-------|
| New suite cold-start fetch count | 1 | Mocked `queryFn` |
| Warm in-memory remount fetch count | 0 extra | Same client, fresh data |
| Post-IDB-restore fetch count | 0 | While within staleTime |
| Wall-clock for mocked cold fetch | ≥ 0 ms | Not a product SLA; no device instrumentation |

**Not measured:** Capacitor WebView TTI, splash duration, real API latency, Android process death. Do not treat Node elapsed times as mobile performance numbers.

---

## 5. Background / resume, offline, process restart, cleared storage

| Scenario | Result |
|----------|--------|
| Background / resume | Config: no focus refetch; reconnect refetch on. Cached data retained if refresh fails. **PASS** |
| Offline | Prior successful data remains addressable after failed refetch. **No dedicated offline UI / SW claimed.** **PASS** (keep-cache only) |
| Process restart | In-memory alone loses data; IDB restore recovers dehydrated queries. **PASS** |
| Cleared storage | `clearPersistedConnectCache` / `clearAllPersistedConnectCaches` → restore returns empty → cold path. **PASS** |
| Volatile roots | inbox / transport not dehydrated → will network on reopen. **PASS** (by design) |

---

## 6. Authentication, logout, user switching

| Check | Result |
|-------|--------|
| Persist keys isolated by `userId` | PASS |
| `removeForeignUserConnectQueries` drops prior account | PASS (isolation + new suite) |
| Logout clears IDB buckets (`clearAllPersistedConnectCaches`) | Wired in `app-state.signOut` + 401 handler; suite verifies wipe |
| Linked-children cache not shared across users | PASS (`linked-children-cache.test.ts`) |
| Signed URLs not persisted | PASS (`sanitize-persisted`) |
| Password/token-shaped keys not dehydrated | PASS |
| Different user cannot read prior user’s query key | PASS |

Passwords and access tokens are **not** written into the RQ persist layer. Session continuity uses Supabase auth storage separately from the Connect query IDB cache.

---

## 7. Tests executed

| Command | Result |
|---------|--------|
| `npm run test --workspace=@lumenx/app-connect` | **188 passed / 51 files** (includes new suite) |
| Focused cache files (persist, isolation, sanitize, linked-children, load-cache-reload) | **36 passed** |
| `npm run typecheck --workspace=@lumenx/app-connect` | **PASS** (exit 0) |
| `npm run lint --workspace=@lumenx/app-connect` | **PASS** (0 errors; 95 pre-existing warnings) |
| `git diff --check` | **PASS** (exit 0; unrelated CRLF notices elsewhere) |
| Production `vite build` | **Not run** this pass (historical hang risk; not required to validate cache logic) |

New file: `apps/connect/src/lib/connect-queries/load-cache-reload.test.ts` — **14 tests** covering scenarios A–F.

---

## 8. Files changed

| File | Reason |
|------|--------|
| `apps/connect/src/lib/connect-queries/load-cache-reload.test.ts` | **Added** automated cold/warm/offline/restart/auth cache tests |
| `qa-artifacts/connect-load-cache-performance-report.md` | **Added** this report |

**No production/runtime source changes.** Caching behaviour was already implemented; inspection did not justify a persistence or UI rewrite.

---

## 9. Remaining limitations

- No Android emulator / physical device timings or splash instrumentation.
- No Playwright E2E of full AppShell paint (Vitest is Node, `*.test.ts` only; no Testing Library in Connect).
- Offline means “keep last successful RQ data,” not a guaranteed offline product mode.
- Inbox, messages, and live transport intentionally reload on reopen.
- Real Supabase/API latency and Capacitor WebView startup are outside this report.
- During IDB restore (`useConnectQueryRestoring`), portals may show skeletons briefly until hydrate completes (≤ ~2.5s failsafe) — by design to avoid empty-state flash.

---

## 10. Conclusion — Does Connect reopen without loading everything again?

**For dehydrated portal/module data: yes (by design and by automated proof).**

On a subsequent launch with the same user:

1. Session hydrates from `localStorage` without forcing the login screen.  
2. User-scoped RQ cache restores from IndexedDB.  
3. Portal queries stay disabled until restore finishes, then paint from cache.  
4. Fresh cache avoids duplicate network calls; stale data can background-refresh without blanking the UI when `data` already exists.

**Exceptions (expected):** first install / cleared storage / new user; inbox, messages, live transport; expired auth (session cleared).

**Final status:** `PARTIAL — CODE TESTS PASSED, DEVICE PERFORMANCE NOT VERIFIED`
