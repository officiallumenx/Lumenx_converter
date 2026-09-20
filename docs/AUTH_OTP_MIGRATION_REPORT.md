# Auth + OTP Migration Report

**Date:** 2026-09-20  
**Cutover defaults:** `VITE_AUTH_PROVIDER=supabase`, `OTP_SMS_PROVIDER=startmessaging` (production)

## Outcome

| Criterion | Status |
|-----------|--------|
| Identity = Supabase Auth only (production path) | Done — provider always `supabase` |
| OTP challenges unchanged (5m / 5 attempts / 30s) | Unchanged — `workflow-otp.ts` |
| SMS delivery = StartMessaging | Done — `deliver.ts` + env gates |
| API bearer = Supabase JWT | Unchanged — `requireAuth` |
| Six apps same UI, wiring only | Done |
| Firebase kept for FCM / Analytics / Crashlytics | Done (Auth leftovers stripped) |
| No demo OTP in production | Unchanged — production forces live delivery |

## What changed

### Backend
- `OTP_SMS_PROVIDER=startmessaging` with `STARTMESSAGING_*` secrets (server-only)
- Production packaging: StartMessaging credentials required when selected; Firebase Admin required only when `FCM_WORKER_ENABLED` (default on)
- Phase 4: Firebase Auth bridge removed (`/auth/firebase/session|whoami|resolve|link`); public hints at `GET /api/v1/firebase/public-config`

### Frontend (all six apps)
- Interactive Auth is Supabase-only (`normalizeAuthProvider` always `supabase`)
- Admin / Connect / Nexus: server OTP (StartMessaging) + password/PIN
- Admissions / Careers / Transport: Supabase password / PIN
- Logout via `clearAppAuthSession` (Supabase + local; FCM token invalidation unchanged)
- No screen / layout / label changes

### Ops
- Dry-run script: `backend/scripts/link-supabase-auth-from-profiles.mjs` (`--apply` to create missing `auth.users` with same id as `user_profile`)
- Behavior freeze: `docs/AUTH_OTP_BEHAVIOR_FREEZE.md`

## Rollback (historical)

Firebase Auth is retired. Do not expect `/auth/firebase/session` or Firebase phone OTP. Use Supabase + StartMessaging. Firebase Admin/web config remains for FCM only.

## Manual checklist (ops)

- [ ] Production: `OTP_SMS_PROVIDER=startmessaging` + template/API key
- [ ] Production: six apps built (Auth is Supabase; `VITE_FIREBASE_*` only for FCM)
- [ ] Smoke: Admin / Connect / Nexus OTP request → SMS → verify → session
- [ ] Smoke: Admissions / Careers email password; Transport PIN
- [ ] Confirm FCM still initializes; Analytics / Crashlytics untouched
- [ ] Run link script dry-run against prod read replica / staging before `--apply`
