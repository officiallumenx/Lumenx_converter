# Manual Transport APK install for staging acceptance

**Do not** use `apps/transport/.env.production` as-is — it points at **production** API `https://api.lumenxtech.in`.

## Why automatic APK was skipped

1. Railway CLI is linked to **production** (`api.lumenxtech.in`) — deploying there is forbidden for this task.
2. No Android device attached (`adb devices` empty).
3. Capacitor release build without a staging Vite env would wire the APK to production.

## Staging-safe build (operator)

1. Create gitignored `apps/transport/.env.staging.local` (or Capacitor mode env) with:
   - `VITE_API_BASE_URL=<staging API reachable from device>`  
     - USB device + local API: `adb reverse tcp:8787 tcp:8787` then `http://127.0.0.1:8787`  
     - Or a **hosted staging API** URL (not production)
   - `VITE_SUPABASE_URL=https://yveadybpntziyryxsrsu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<staging anon>`
2. Build:  
   `cd apps/transport`  
   `npx vite build --config vite.config.capacitor.ts --mode <staging-mode>`  
   (or copy staging vars into a temporary env the capacitor config loads — do not commit)
3. `npx cap sync android`
4. `cd android && .\gradlew.bat assembleRelease` (or debug for test devices)
5. Install: `adb install -r <path-to-apk>`
6. Confirm app Settings / network calls hit staging ref only.

## After install

Execute `qa-artifacts/transport-device-acceptance-checklist.md` scenarios A–E (and F–G if time).
