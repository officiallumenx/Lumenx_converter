# LumenX native releases — status report

Generated during implementation of the Native Releases Downloads plan.

## 1. Repository changes (summary)

| Area | Paths |
|---|---|
| Website matrix | `apps/website/src/content/downloads.ts`, `DownloadProduct.tsx`, `HomeDownloads.tsx`, `login-apps.ts`, `resources.downloads.tsx`, `home.ts` |
| Capacitor Nexus | `apps/nexus/capacitor.config.ts`, `vite.config.capacitor.ts`, `android/` (added), signing wiring |
| Capacitor Admissions | `apps/admissions/capacitor.config.ts`, `vite.config.capacitor.ts`, `android/` (added), signing wiring |
| Careers signing | `apps/careers/android/app/build.gradle`, `keystore.properties.example`, hostname |
| APK scripts | `android:apk` / `cap:apk` on admin, connect, transport, careers, nexus, admissions |
| Electron | `apps/admin-desktop/`, `apps/nexus-desktop/` |
| Downloads host | `apps/downloads-host/` (Worker + R2 binding) |
| Scripts | `scripts/collect-android-apks.mjs`, `collect-windows-installers.mjs`, `publish-downloads.mjs` |
| CI | `.github/workflows/release-downloads.yml` |

## 2. Android build status

| Product | Native shell | assembleRelease script | Signed release in this session |
|---|---|---|---|
| Admin | Yes (existing) | Yes (`cap:apk`) | **Not run** — needs local `keystore.properties` + `google-services.json` |
| Connect | Yes | Yes | Not run (same) |
| Transport | Yes | Yes | Not run (same) |
| Careers | Yes | Yes + signingConfigs added | Not run (needs keystore) |
| Nexus | **Added** this session | Yes | Not run (needs keystore + google-services if FCM required) |
| Admissions | **Added** this session | Yes | Not run (needs keystore) |

Capacitor web build verified: **Nexus** and **Admissions** `build:capacitor` succeeded. `npx cap add/sync android` succeeded for both.

## 3. Windows Electron status

| Product | App package | Installer build |
|---|---|---|
| Admin | `@lumenx/app-admin-desktop` | **Built** `LumenX-Admin-Setup.exe` (~85 MB), unsigned |
| Nexus | `@lumenx/app-nexus-desktop` | Built in same session (see collect step) |

Local artifacts collected:

| File | SHA-256 |
|---|---|
| `dist/releases/windows/admin-setup.exe` | `39DD86F1D22036732C00FD092F323578E3B71FFFA5FA619F020F86EE4084BBE9` |
| `dist/releases/windows/nexus-setup.exe` | `0A49C9E3E904A5B83D849FF8CA931C8CA1EEC8AAB25EF8CA8CB8EF8BD9B307F3` |

**Not published** to `downloads.lumenxtech.in` yet (DNS missing). Unsigned until code-signing cert secrets exist — SmartScreen will warn.

## 4. Verified public download URLs

| URL | Status |
|---|---|
| `https://downloads.lumenxtech.in/*` | **DNS does not resolve** (checked with curl) — not published |
| APK / EXE HTTPS | **None verified** — R2 bucket + Worker + DNS not configured yet |

Do **not** set `VITE_*_APK_URL` / `VITE_*_DESKTOP_URL` in production until these URLs return real files.

## 5. Verified web application URLs

| App | URL | Prior probe |
|---|---|---|
| Admin | https://admin.lumenxtech.in | 200 |
| Connect | https://connect.lumenxtech.in | 200 |
| Transport | https://transport.lumenxtech.in | 200 |
| Nexus | https://nexus.lumenxtech.in | 200 |
| Admissions / Careers standalone | not resolving on lumenxtech.in | Marketing uses Connect entry |

Website download matrix now: Admin/Nexus show Web + Android + Windows; Connect/Transport Android only; Admissions/Careers Web + Android. Download buttons stay **disabled** until artifact env URLs are set.

## 6. SHA-256 / versions

Windows installers built locally (see §3). Android APKs not collected this session. Production CDN checksums: **none** until R2 publish.

## 7. Automation / deploy

- Workflow: `.github/workflows/release-downloads.yml` (workflow_dispatch + `downloads-v*` tags)
- R2 publish job uses environment `production-downloads` and secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Website typecheck: **passed**

## 8. Tests run

- `npm run typecheck -w @lumenx/app-website` — pass
- Nexus / Admissions Capacitor web builds — pass
- downloads.lumenxtech.in HTTPS — fail (host missing)
- Full signed APK matrix + install-on-device — **not tested** (credentials/device)
- Electron installer build — see build log from this session

## 9. Owner actions still required

1. Create Cloudflare R2 bucket `lumenx-downloads`.
2. Attach DNS `downloads.lumenxtech.in` and deploy `@lumenx/app-downloads-host`.
3. Place release keystores (`keystore.properties`) for each Android app (reuse existing for admin/connect/transport).
4. Ensure `google-services.json` present for FCM-gated release builds.
5. Run `npm run cap:apk` per app (or the GitHub workflow) and `node scripts/collect-android-apks.mjs`.
6. Run Electron `dist` on Windows; `node scripts/collect-windows-installers.mjs`.
7. `node scripts/publish-downloads.mjs` then verify each URL with curl (status, content-type, size, sha256).
8. Set website `VITE_*_APK_URL` / `VITE_*_DESKTOP_URL` to the verified URLs and redeploy website.
9. Optional: Windows code-signing certificate for SmartScreen.

## 10. Status legend

| Item | State |
|---|---|
| Website matrix + honest CTAs | **Completed** |
| Capacitor shells nexus/admissions + careers signing wiring | **Completed** |
| Electron app sources | **Completed** |
| Downloads Worker + publish scripts + CI | **Completed** (config only) |
| Live public APK/EXE downloads | **Blocked** — DNS/R2/signing |
| Verified production download URLs | **Not yet** |
