# LumenX Admin — Android Location Permission Release Report

Date: 2026-10-31  
App ID: `com.lumenx.app.admin`  
Build version: **1.0.20 (versionCode 20)**

Status vocabulary: **PASS** | **FAIL** | **BLOCKED** | **NOT RUN**

---

## 1. Root cause addressed

Admin Android previously lacked `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` and `@capacitor/geolocation`, so Location never appeared in app permissions and school-location detection failed as denied.

Code fix was already landed. This report covers **new signed artifacts** that include those permissions, plus verification of **merged** manifests and packaging.

---

## 2. Pre-build inspection (Phase 1)

| Finding | Detail |
|---------|--------|
| Scripts | `cap:sync`, `android:apk` (`assembleRelease`), `android:aab` (`bundleRelease`), `cap:apk` / `cap:aab` |
| Geolocation dep | `@capacitor/geolocation@^7.1.8` with Capacitor 7.x — compatible |
| Plugin in Gradle | `capacitor-geolocation` in `android/capacitor.settings.gradle` |
| Source manifest | FINE + COARSE present; CAMERA + POST_NOTIFICATIONS retained; no RECORD_AUDIO |
| Signing | `apps/admin/android/keystore.properties` **exists** — release signing available |
| Prior Desktop AAB | `LumenX-Admin.aab` dated 12:28 (v19) **before** location rebuild — archived |
| adb | SDK `platform-tools\adb.exe` present; **no devices attached** |

**Blockers for full closure:** physical Android device (runtime), Chrome/Edge interactive QA.

No additional code defects found that blocked the build. Version bumped **19 → 20** so Play can accept a new AAB that includes location (v19 Desktop artifact did not).

---

## 3. Files changed (this build pass)

| File | Change |
|------|--------|
| `apps/admin/android/app/build.gradle` | `versionCode 20` / `versionName "1.0.20"` |
| (prior session) location helper, TransportSettingsView, source manifest, package.json | Unchanged this pass |

Prior AAB preserved under:

`Desktop\LumenX-Play-AABs\archive\`

---

## 4. Capacitor sync

| Step | Status | Notes |
|------|--------|-------|
| `npm run build:capacitor` (+ hang watchdog) | **PASS** | `dist/index.html` produced |
| `npx cap sync android` | **PASS** | Plugins include `@capacitor/geolocation@7.1.8` among 7 plugins |

---

## 5. Source + merged manifest verification

Inspected Gradle outputs (not only source):

- `intermediates/merged_manifests/release/.../AndroidManifest.xml`
- `intermediates/merged_manifests/debug/.../AndroidManifest.xml`
- `intermediates/packaged_manifests/release/.../AndroidManifest.xml`
- `aapt dump badging` on **release APK**

| Permission / field | Release merged | Debug merged | Packaged | aapt (release APK) |
|--------------------|----------------|--------------|----------|--------------------|
| ACCESS_COARSE_LOCATION | **PASS** | **PASS** | **PASS** | **PASS** |
| ACCESS_FINE_LOCATION | **PASS** | **PASS** | **PASS** | **PASS** |
| CAMERA | **PASS** | **PASS** | **PASS** | **PASS** |
| POST_NOTIFICATIONS | **PASS** | **PASS** | **PASS** | **PASS** |
| RECORD_AUDIO absent | **PASS** | **PASS** | **PASS** | **PASS** |
| versionCode 20 / 1.0.20 | **PASS** | **PASS** | **PASS** | **PASS** |

Copies: `qa-artifacts/admin-android-location-build/merged-manifest-*.xml`

**Manifest verified: PASS**

---

## 6. Build commands and results

Working directory: `apps/admin`  
JDK: portable Temurin 21 under `.tools/jdk-21`

| Command | Exit | Status |
|---------|------|--------|
| Capacitor web build + flatten | 0 | **PASS** |
| `npx cap sync android` | 0 | **PASS** |
| `gradlew.bat assembleDebug` | 0 | **PASS** |
| `gradlew.bat assembleRelease bundleRelease` | 0 | **PASS** |

**Build verified: PASS** (signed release using existing keystore; secrets not logged)

---

## 7. Artifacts, version, SHA-256

| Artifact | Path | Bytes | SHA-256 |
|----------|------|------:|---------|
| Release AAB | `Desktop\LumenX-Play-AABs\LumenX-Admin-1.0.20-vc20.aab` | 8 342 806 | `5F5E2BD7D1DA902B4E6088E3EF1EBC0E4F7FA6F0AA185462AAC95E1B0DE55636` |
| Release AAB (Play name) | `Desktop\LumenX-Play-AABs\LumenX-Admin.aab` | same | same |
| Release APK | `Desktop\LumenX-Play-AABs\LumenX-Admin-1.0.20-vc20-release.apk` | 9 013 509 | `6ECA6522EDD6F56E471FA6603DC7845714739083BDAC5F1659253868B0DFA66A` |
| Debug APK | `Desktop\LumenX-Play-AABs\LumenX-Admin-1.0.20-vc20-debug.apk` | 10 781 904 | `C3A409D02C4E77116233517C24B871328D321A58CBAA02EDCD9AD122DC18EA73` |

Also copied under `qa-artifacts/admin-android-location-build/`.  
Checksums TSV: `qa-artifacts/admin-android-location-build/checksums.tsv`

Gradle originals:

- `apps/admin/android/app/build/outputs/apk/debug/app-debug.apk`
- `apps/admin/android/app/build/outputs/apk/release/app-release.apk`
- `apps/admin/android/app/build/outputs/bundle/release/app-release.aab`

**Not published / not deployed.**

---

## 8. Automated tests

| Check | Result |
|-------|--------|
| `vitest run src/lib/location/browser-location.test.ts` (7 tests) | **PASS** (exit 0) |
| `tsc --noEmit` (Admin) | **PASS** (exit 0) |
| Full Admin suite / E2E regression | **NOT RUN** (out of scope; location-focused verification only) |

**Code verified (location helper + typecheck): PASS**

---

## 9. Physical-device runtime

| Item | Status |
|------|--------|
| `adb devices` | Empty list |
| Install / App Info → Location listed | **BLOCKED** — no device |
| Permission states (approx/precise/deny/settings/GPS off) | **BLOCKED** |
| School location detect → confirm → save → reload | **BLOCKED** |
| Failure handling on device | **BLOCKED** |

**Android runtime verified: BLOCKED**

### Manual steps for you (when a phone is available)

1. Enable USB debugging; confirm `adb devices` shows the device.  
2. Install:  
   `adb install -r "C:\Users\Lokesh vella\Desktop\LumenX-Play-AABs\LumenX-Admin-1.0.20-vc20-release.apk"`  
   (or sideload the debug APK for faster iteration).  
3. Settings → Apps → LumenX Admin → Permissions → confirm **Location** is listed (along with Camera / Notifications).  
4. Open Admin → Transport settings → School endpoint → **Detect my location** (do not expect a prompt until this tap).  
5. Exercise: allow approximate, allow precise, deny, deny then enable in Settings, GPS off, GPS on.  
6. Confirm coords appear → **Use these coordinates** → **Save settings** → reload and confirm persistence.  
7. Confirm denial / GPS-off messaging is accurate (not a false success).

---

## 10. Chrome / Edge web regression

| Item | Status |
|------|--------|
| HTTPS school location / site settings / gesture-only | **NOT RUN** — no interactive browser session in this pass |

**Browser runtime verified: NOT RUN**

Web path remains `https://admin.lumenxtech.in` (secure context). Native APK changes do not replace web QA.

---

## 11. Regression protection

| Area | Status |
|------|--------|
| Location unit tests + tsc | **PASS** |
| Login / dashboard / camera / uploads / notifications / navigation | **NOT RUN** as full UI regression |
| Connect / Transport / Nexus / other apps | Untouched (**PASS** by non-modification) |

---

## 12. Status summary

| Layer | Status |
|-------|--------|
| Code verified | **PASS** |
| Build verified | **PASS** |
| Manifest verified (merged + aapt) | **PASS** |
| Android runtime verified | **BLOCKED** (no device) |
| Browser runtime verified | **NOT RUN** |

**Overall: PARTIAL — build/manifest ready; runtime not closed.**

This issue is **not** fully resolved until device (and preferably Chrome/Edge) runtime checks pass.

---

## 13. Remaining blockers & exact next actions for you

1. **Connect an Android device** (or emulator) with USB debugging.  
2. **Install** `LumenX-Admin-1.0.20-vc20-release.apk` from Desktop `LumenX-Play-AABs`.  
3. Run the Phase 6 checklist above; reply with results (or ask to re-run with device attached).  
4. Optionally upload `LumenX-Admin-1.0.20-vc20.aab` / `LumenX-Admin.aab` to the **existing Production draft** in Play Console (do not create a second draft).  
5. Optionally re-test school location on **Chrome/Edge** at `https://admin.lumenxtech.in`.
