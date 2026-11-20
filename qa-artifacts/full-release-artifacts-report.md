# LumenX — Full Release Artifacts Report

**Date:** 2026-10-20  
**Git tip (at artifact build):** `4a50fa1127c092d4db006e6fc5e7867fb111c6a3`  
**Note:** Artifacts are local build outputs — **not** uploaded to R2/website in this run.

---

## 1. Android (fresh this session)

| Product | applicationId | versionName / versionCode | Artifact | Path | Bytes | SHA-256 |
|---------|---------------|---------------------------|----------|------|------:|---------|
| Admin | `com.lumenx.app.admin` | 1.0.14 / 14 | AAB | `apps/admin/android/app/build/outputs/bundle/release/app-release.aab` (also `dist/releases/android/admin.aab`) | 8209411 | `605F8764BB3A70C43D3A8FE06E9E67CDE018F54B6C3514821E196AC2A0907B95` |
| Admin | same | same | APK | `dist/releases/android/admin.apk` | 8881511 | `D9F699BE9626E9E9ABF6694EB972E19D714429AF9569125E031993ECDFAC8DBF` |
| Connect | `com.lumenx.app.connect` | 1.0.10 / 11 | AAB | `dist/releases/android/connect.aab` | 6129929 | `15F35B38E7AC336508AF9BCE9D17D842B25B3EA8C13A540B64D396820C2D6C84` |
| Connect | same | same | APK | `dist/releases/android/connect.apk` | 6332843 | `1DC734687C07DC8FAFC2476088FF4D8F244A59D23903ED80FB479B48C1FDD4E8` |
| Transport | `com.lumenx.app.transport` | 1.0.5 / 6 | AAB | `dist/releases/android/transport.aab` | 4997473 | `D9E8AC7923A874F27BBB2D985A0A612566C88161750959A9E89D74F37865BA1D` |
| Transport | same | same | APK | `dist/releases/android/transport.apk` | 5218334 | `402CD7E7C7A916DCECD55CAD5AC0849087C30DC77E6643CABB96CD3B945366E4` |

### Signing verification

`apksigner verify --verbose` on Admin/Connect/Transport release APKs: **Verifies** (APK Signature Scheme v2). Keystore material not printed/committed.

### Not claimed as fresh release builds

Collector also copied existing `admissions.apk`, `careers.apk`, `nexus.apk` from prior android outputs — **not rebuilt this session**; **out of product claims**.

---

## 2. Windows EXE (fresh this session)

| Product | Installer | Path | Bytes | SHA-256 | Code signing |
|---------|-----------|------|------:|---------|--------------|
| Admin desktop | `LumenX-Admin-Setup.exe` / collected `admin-setup.exe` | `apps/admin-desktop/dist-out/LumenX-Admin-Setup.exe` → `dist/releases/windows/admin-setup.exe` | 85489863 | `40C2ADD40D9E781EBF2E407256A3AC108EBB33A9696D0DC8BE74ED7D12C0B592` | **Skipped** (no CSC / signtool identity) |
| Nexus desktop | `LumenX-Nexus-Setup.exe` / collected `nexus-setup.exe` | `apps/nexus-desktop/dist/LumenX-Nexus-Setup.exe` → `dist/releases/windows/nexus-setup.exe` | 85296636 | `73CFE13680BCA742ECD0733341181F26B745589F202A6F10636B38EEFDFEDCA0` | **Skipped** (no CSC); default Electron icon |

Prior `dist-out` Admin installer dated 2026-10-18 was **replaced** by the fresh 2026-10-20 build (same path; new checksum above).

---

## 3. Publish status

| Step | Status |
|------|--------|
| Local collect APK/EXE | **PASS** |
| R2 / `publish-downloads.mjs` | **BLOCKED** — Wrangler API fetch failed; no upload attempted that claimed success |
| Website URL update | **NOT RUN** |
| Live URL verification | **NOT RUN** |

AAB files are for Play Console; website downloads should use APKs only when publish is unblocked.
