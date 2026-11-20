# LumenX Admin — Browser & Device Permissions Audit

Date: 2026-10-31  
Scope: Admin web, Admin Android (Capacitor), photos, school location, audio

## Root cause — missing Location permission

**Why Location did not appear in site / app permission lists**

Chrome (and Android WebView “site settings”) only list permissions that the origin has **declared and actually requested**. Admin already requested:

- **Camera** — `@capacitor/camera` + `CAMERA` in `AndroidManifest.xml`
- **Notifications** — push / local-notification plugins + `POST_NOTIFICATIONS`

Admin did **not**:

1. Declare `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` in the Android manifest  
2. Depend on `@capacitor/geolocation`  
3. Call a native permission request before `getCurrentPosition`

School location used raw `navigator.geolocation.getCurrentPosition()` only (`TransportSettingsView.tsx`). On the Capacitor Android WebView that fails as **permission denied** without ever registering Location in the permission UI — so the user sees Camera + Notifications only.

On desktop Chrome, Location appears under site settings **after** a geolocation prompt is shown for that origin. A hard deny without a successful prompt (or looking at settings before any request) also leaves Location absent from the list.

The user-facing phrase *“Location access is denied for this site”* matches browser / WebView denial of geolocation; Admin’s previous toast was similar but less actionable.

## Existing implementation defects

| Area | Defect |
|------|--------|
| School location | Web-only `navigator.geolocation`; no secure-context check; no confirm-before-apply; weak denial guidance |
| Android Admin | No location permissions in manifest; no Geolocation Capacitor plugin |
| Permissions API | Risk of treating missing query as denied (avoided in new helper) |
| Startup | Location was **not** requested at startup (good) |
| Photos | Already use file / Capacitor Camera pickers with compression; gallery falls back to system picker |
| Microphone | **No Admin feature** uses `getUserMedia` / `MediaRecorder` — no mic permission required |

## Changes made

1. Added `@capacitor/geolocation` to `@lumenx/app-admin` and `npx cap sync android`.
2. Declared `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` in Admin `AndroidManifest.xml` (foreground / one-shot only — **no** background location).
3. New helper `apps/admin/src/lib/location/browser-location.ts`:
   - Secure-context check  
   - Native: Cap check/request + coarse-then-fine position  
   - Web: `getCurrentPosition` on user gesture only  
   - Distinct errors: unsupported, insecure, denied, unavailable, timeout  
   - Permissions API used as optional hint only  
4. `TransportSettingsView` uses the helper: explain → detect → show coords → **Use these coordinates** → Save settings; retry after denial.  
5. Photos toast distinguishes camera vs gallery denial.  
6. Unit tests for the location helper (7 passing).

## Files modified

- `apps/admin/package.json` (+ lockfile via npm install)
- `apps/admin/android/app/src/main/AndroidManifest.xml`
- `apps/admin/android/capacitor.settings.gradle` (via `cap sync`)
- `apps/admin/src/lib/location/browser-location.ts` *(new)*
- `apps/admin/src/lib/location/browser-location.test.ts` *(new)*
- `apps/admin/src/components/transport/views/TransportSettingsView.tsx`
- `apps/admin/src/routes/photos.tsx`
- `qa-artifacts/admin-permissions-audit-report.md` *(this file)*

## Browser permission test results

| Case | Result | Evidence |
|------|--------|----------|
| Helper: insecure context | Pass — rejects `insecure_context`, does not call geolocation | vitest |
| Helper: granted coords | Pass | vitest |
| Helper: PERMISSION_DENIED mapping | Pass — site-settings guidance | vitest |
| Helper: Permissions API missing / throw → `unknown` | Pass | vitest |
| Typecheck Admin | Pass (`tsc --noEmit`) | CLI 2026-10-31 |
| Live Chrome / Edge first-time prompt | **Not run in this session** (no interactive browser attach) | Blocked |
| Live deny → site settings → retry | **Not run** | Blocked |
| Live school save end-to-end | **Not run** | Blocked |

Admin production host remains HTTPS: `https://admin.lumenxtech.in` (Capacitor `hostname` matches).

## Android & Windows permission test results

| Platform | Result | Notes |
|----------|--------|-------|
| Android manifest + Cap sync | Pass | Geolocation listed among 7 plugins; FINE/COARSE declared |
| Android runtime prompt / GPS-off | **Not run** | Requires device/emulator + rebuilt APK/AAB |
| Windows desktop shell | N/A | Admin has no Electron/Tauri desktop package; Windows = browser (Chrome/Edge) |
| PWA | Not separately packaged beyond Capacitor / web | Same web geolocation path |

## Photos & audio summary

- **Photos:** Gallery and camera flows in `lib/photos/capture.ts` + Photos route already validate/compress via `prepareProfilePhotoFile`, show busy/status, and avoid broad storage when the system picker works. Minor denial copy improved.  
- **Audio / microphone:** No Admin recording or mic features found. **Do not** add `RECORD_AUDIO` or request mic on open. Audio file upload is not a dedicated Admin workflow (use generic file inputs where present).

## Remaining limitations

1. Ship a new Admin Android build (AAB/APK) before Play / device users get Location in app permissions.  
2. Interactive Chrome/Edge/Android UX verification still needed on a real device.  
3. Edge-to-edge / DEX Play Console recommendations are unrelated to this permission fix.  
4. Admin does not include Transport’s custom `LocationSettings` fused-provider plugin; Cap Geolocation + Web API are sufficient for one-shot school pin.

## What works / what was fixed / what’s still blocked

| | |
|--|--|
| **Fixed** | Root cause of Location missing from Admin Android permissions; school-location UX; denial guidance; secure-context handling |
| **Works (verified in CI sense)** | Unit tests + `tsc`; Cap sync registers geolocation |
| **Blocked pending human QA** | Live browser prompt, Android runtime grant, end-to-end school location save on prod |
