# Auth / OTP behavior freeze (migration reference)

Historical freeze rules from the Firebase Auth → Supabase Auth migration.
Production path is Supabase Auth + StartMessaging OTP; Firebase is FCM / Analytics / Crashlytics only.

## OTP (server)

| Rule | Value |
|------|-------|
| Length | 6 digits |
| TTL | 5 minutes |
| Max verify attempts | 5 (then burn) |
| Resend cooldown | 30 seconds |
| Hash | SHA-256 `lumenx-otp\|{purpose}\|{challengeKey}\|{otp}` |
| Storage | `login_otp_challenge` (service_role only) |

Purposes: `parent_login`, `staff_login`, `nexus_login`, `connect_login`, `signup_verify`, `password_reset`, `pin_reset`.

## Session

- API bearer = **Supabase** access JWT only (`requireAuth` → `admin.auth.getUser`).
- Apps persist sessions under `lumenx.<app>.supabase.auth.v1`.

### Storage keys (per app)

| App | Supabase auth storage key (typical) |
|-----|-------------------------------------|
| Admin | `lumenx.admin.supabase.auth.v1` |
| Connect | `lumenx.connect.supabase.auth.v1` |
| Nexus | `lumenx.nexus.supabase.auth.v1` |
| Transport | `lumenx.transport.supabase.auth.v1` |
| Admissions | `lumenx.admissions.supabase.auth.v1` |
| Careers | `lumenx.careers.supabase.auth.v1` |

Logout clears Supabase session + app portal keys via `clearAppAuthSession` (best-effort residual Firebase Auth sign-out only).

## Grants

Phone/email OTP verify issues `auth_verification_grant`; login complete consumes grant then `createServerAuthSessionForEmail`.

## firebase_uid inventory

- `user_profile.firebase_uid` is additive historical data; identity remains `user_profile.id` ↔ `auth.users.id`.
- Ops dry-run: `node backend/scripts/link-supabase-auth-from-profiles.mjs` (add `--apply` to create missing Auth users by profile id + email/phone).
- Do not mass-recreate profiles or memberships.

## Firebase retained after migration

FCM, Analytics, Crashlytics only — not Auth / SMS OTP.
Production Auth path: Supabase Auth + `OTP_SMS_PROVIDER=startmessaging` (`VITE_AUTH_PROVIDER` is ignored; always supabase).
