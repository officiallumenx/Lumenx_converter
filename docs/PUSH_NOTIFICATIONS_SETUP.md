# Push notifications setup (Android + web)

End-to-end FCM for Connect, Admin, Transport, and Careers.

## 1. Firebase Android (`google-services.json`)

These files are **gitignored**. Place one per app locally (or via CI secret):

| App | applicationId | Path |
|-----|---------------|------|
| Connect | `com.lumenx.app.connect` | `apps/connect/android/app/google-services.json` |
| Admin | `com.lumenx.app.admin` | `apps/admin/android/app/google-services.json` |
| Transport | `com.lumenx.app.transport` | `apps/transport/android/app/google-services.json` |
| Careers | `com.lumenx.app.careers` | `apps/careers/android/app/google-services.json` |

### Firebase Console steps

1. Open [Firebase Console](https://console.firebase.google.com/) → project `lumenx-2026` (or your project).
2. Project settings → Your apps → Add Android app (or select existing).
3. Enter the `applicationId` exactly as above.
4. Download `google-services.json` into the path in the table.
5. Rebuild the Android app (`npm run build:capacitor && npx cap sync android` then Gradle).

Without this file, Gradle skips the Google Services plugin and **native push will not work**.

## 2. App / web env

Set in each app `.env` (see `.env.example`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_VAPID_KEY` (web push)

## 3. Backend / worker

Required for delivery:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FCM_WORKER_ENABLED=true`
- FCM worker process running (`fcm-worker` / runner in backend)

## 4. Device verification matrix

For each app after a fresh install on Android 13+:

1. Sign in (API mode) → **notification permission dialog** appears.
2. Grant → `GET /api/v1/notifications/device-tokens` returns at least one row for the user.
3. Emit a test notification from Admin → tray when backgrounded; in-app alert when foregrounded.
4. Tap notification → navigates only to a **relative** in-app path (absolute URLs ignored).
5. Sign out → tokens invalidated; further pushes stop for that device token.

## 5. Security notes

- Deep links must be relative (`/…`). Absolute / `javascript:` / `data:` rejected client + server.
- Device tokens register only with authenticated API clients.
- Logout calls `DELETE /api/v1/notifications/device-tokens?app=…` before clearing the session.
- Never log raw FCM tokens.
