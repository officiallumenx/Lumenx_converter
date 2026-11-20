# LumenX downloads host

Cloudflare Worker + R2 bucket for public APK / Windows installer downloads.

## Owner setup (required before live URLs work)

1. Create R2 bucket `lumenx-downloads` in the Cloudflare account that owns `lumenxtech.in`.
2. Add DNS for `downloads.lumenxtech.in` (proxied CNAME/AAAA as Cloudflare directs for the Worker route).
3. Deploy: `npm run deploy -w @lumenx/app-downloads-host`
4. Upload artifacts: `node scripts/publish-downloads.mjs` (after local/CI builds fill `dist/releases/`).
5. Set website env (Workers Builds / `.env.production`) for example:
   - `VITE_ADMIN_APK_URL=https://downloads.lumenxtech.in/android/admin.apk`
   - `VITE_ADMIN_DESKTOP_URL=https://downloads.lumenxtech.in/windows/admin-setup.exe`
   - (same pattern for other products)
6. Redeploy the website.

Until steps 1–4 complete, marketing download buttons stay disabled (honest unavailable).
