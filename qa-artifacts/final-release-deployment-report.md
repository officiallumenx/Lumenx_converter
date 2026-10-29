# LumenX — Final Release / Deployment Report

**Date:** 2026-10-29  
**Branch:** `fix/cloudflare-workers-build-upload`  
**Overall status:** _(filled after push/deploy)_  

---

## 1. Transport root cause and fix

| Item | Detail |
|------|--------|
| Symptom | `apps/transport` `npm test` failed: 1 of 113 tests |
| Failing case | `roster-visibility.test.ts` → `resolveDropStopIdForMark` expected `"school-stop"`, received pickup id |
| Root cause | Stale regression expectation. Intentional behavior in `drop-stop.ts` prefers enrollment **pickup** when `drop_stop_id` is unset (avoids inventing “School”). `drop-stop.test.ts` already documented this; `roster-visibility.test.ts` still asserted the old last-route-stop preference. |
| Fix | Update the stale expectation in `apps/transport/src/features/attendance/roster-visibility.test.ts` to match `drop-stop.ts`. |
| Verification | Transport **typecheck PASS**, **build PASS**, **tests 113/113 PASS**. Capacitor Android packaging was not required for this web/API release path and was stopped after hanging post-prerender. |

Historical `qa-artifacts/release-transport-tsc.txt` errors are obsolete; current Transport `tsc` is clean.

---

## 2. Validation results

| Surface | Result |
|---------|--------|
| Transport typecheck | **PASS** |
| Transport production build (`vite` + CF prepare) | **PASS** |
| Transport tests | **PASS** 113/113 |
| Connect tests | **PASS** 225/225 (70 files) |
| Connect typecheck | **PASS** |
| Connect lint | **PASS** (0 errors, 95 warnings) |
| Connect production build | **PASS** |
| Backend diary + db-errors + background-jobs tests | **PASS** 18 |
| Admin typecheck | **PASS** |
| Website Astro build | **PASS** (34 pages) |
| `git diff --check` (connect/transport/backend) | **PASS** (CRLF→LF warnings only) |
| Wrangler / Cloudflare Workers deploy | **BLOCKED** — `wrangler whoami` fetch failed (connectivity) |
| Synthetic Connect E2E (this session) | Not re-run; prior final-latency harness **PASS** on this tree |

---

## 3. Release contents (intended)

- Connect Parent/Teacher/Student cold-path latency work (shell paint, inbox reuse, roster epoch, etc.)
- Backend diary reminder conflict mapping (fixes production worker spam)
- Transport drop-stop test alignment
- Website Astro marketing site migration (build verified)
- Staging E2E fixture student label sync
- `package-lock.json` for website dependency set

**Excluded:** `apps/admin-desktop/dist-out/`, browser QA screenshots/raw JSON, harness scratch files, local `.env` secrets, `apps/website/dist/`.

---

## 4. Git / GitHub

_(filled after commit/push)_

---

## 5. Railway

| Item | Detail |
|------|--------|
| Project | LumenX / service `Lumenx_converter` |
| Public URL | `https://api.lumenxtech.in` |
| Pre-deploy status | Online; last SUCCESS deploy 2026-10-24 |
| Pre-deploy issue | Background `diary` job failing every ~60s with mis-mapped **“This subject already exists”** (fixed in this release’s `mapDbError` + reminder 409 handling) |

_(deploy result filled below)_

---

## 6. Remaining risks / manual actions

1. Cloudflare Workers (Connect/Transport/Admin) and Pages (website) could not be deployed from this environment — wrangler fetch failed. Redeploy from a network that can reach Cloudflare, or via CI.
2. Railway production deploy of the API is required to stop diary worker error spam.
3. No production DB migrations were applied in this pass (diary fix is application-layer only).
4. Website `.env` exists locally and remains gitignored — do not commit it.
