# Push notifications setup (Android + web)

End-to-end FCM for Connect, Admin, Transport, and Careers.

## 1. Firebase Android (`google-services.json`)

These files are **gitignored**. Place one per app locally (or inject via CI secret):

| App | applicationId | Path | CI env (never commit values) |
|-----|---------------|------|------------------------------|
| Connect | `com.lumenx.app.connect` | `apps/connect/android/app/google-services.json` | `GOOGLE_SERVICES_JSON_CONNECT` |
| Admin | `com.lumenx.app.admin` | `apps/admin/android/app/google-services.json` | `GOOGLE_SERVICES_JSON_ADMIN` |
| Transport | `com.lumenx.app.transport` | `apps/transport/android/app/google-services.json` | `GOOGLE_SERVICES_JSON_TRANSPORT` |
| Careers | `com.lumenx.app.careers` | `apps/careers/android/app/google-services.json` | `GOOGLE_SERVICES_JSON_CAREERS` |

### Local development

1. Open [Firebase Console](https://console.firebase.google.com/) → project matching `VITE_FIREBASE_PROJECT_ID`.
2. Project settings → Your apps → Add Android app (or select existing).
3. Enter the `applicationId` exactly as above.
4. Download `google-services.json` into the path in the table.
5. Rebuild (`npx cap sync android` then Gradle).

**Debug** builds warn and continue if the file is missing (no FCM).  
**Release / bundle / publish** builds **fail** with a clear Gradle error if the file is missing.

### CI / store builds

```bash
# Set env vars to raw JSON or base64 (script never prints contents)
node scripts/inject-google-services.mjs
# or one app:
node scripts/inject-google-services.mjs --app connect

# Verify release gates are present in Gradle files
node scripts/verify-android-fcm-build-gate.mjs
```

Never place Firebase **service-account private keys** in the Android project. Only the public client `google-services.json` belongs there.

## 2. App / web env

Set in each app `.env` (see `.env.example`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_VAPID_KEY` (web push)

## 3. Backend / worker (production)

Required on the API host (e.g. Render) when push is enabled:

- `FCM_WORKER_ENABLED=true`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

The API process starts the FCM worker in-process. Production refuses to boot when the worker is enabled but Firebase Admin credentials are missing/invalid.

Safe readiness: `GET /api/v1/health/ready` reports `fcm.workerEnabled`, `fcm.firebaseConfigured`, `fcm.workerRunning`, `fcm.projectId` (no secrets).

Staff delivery trace: `GET /api/v1/notifications/:id/delivery?institute_id=…` (masked token fingerprints only).

### Foreground vs background UX

- **Foreground:** in-app alert + chime only (Capacitor does **not** use `presentationOptions: ["alert"]` to avoid duplicate system trays).
- **Background / killed:** FCM `notification` payload → system tray via channels `lumenx_alerts` / `lumenx_notifications`.

## 4. Device verification matrix

For each app after a fresh install on Android 13+:

1. Sign in → **notification permission dialog** appears.
2. Grant → `GET /api/v1/notifications/device-tokens` returns at least one row for the user.
3. If denied → recovery banner → open Android notification settings → grant → token registers.
4. Emit a test notification from Admin → tray when backgrounded; in-app alert when foregrounded.
5. Tap notification → navigates only to a **relative** in-app path (absolute URLs ignored).
6. Sign out → tokens invalidated; further pushes stop for that device token.

## 5. Security notes

- Deep links must be relative (`/…`). Absolute / `javascript:` / `data:` rejected client + server.
- Device tokens register only with authenticated API clients; **app** must be allowed for the actor’s roles.
- FCM enqueue targets only `payload.targetApps` (or category defaults) — not every app token for the user.
- Logout calls `DELETE /api/v1/notifications/device-tokens?app=…` before clearing the session.
- Never log raw FCM tokens or Firebase private keys.
