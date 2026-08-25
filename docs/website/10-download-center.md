# 10 — Download Center

Route: `/download`

The site distributes **how to get the apps**. It does not host binary blobs in git.

## 1. Channels

| Product | Web | Android (Capacitor) | iOS |
|---------|-----|---------------------|-----|
| Admin | Yes (Workers) | Yes (when APK published) | Not in W1 |
| Connect | Yes | Yes | Not in W1 |
| Transport | Yes | Yes | Not in W1 |
| Nexus | Yes | No (W1) | No |
| Website | This app | N/A | N/A |

Web URLs: placeholders in `src/content/downloads.ts` until production origins exist. Prefer env `VITE_*_ORIGIN`.

## 2. Page layout

1. Intro: use the web app now; install Android for office / parents / drivers on the go.  
2. One card per product:  
   - Open in browser (external or `#` disabled with note)  
   - Download Android APK (disabled + “Coming with the next public build” if `apkUrl` is null)  
   - Version string if known (`apps/*/package.json` is not read at runtime in W1 — hardcode or omit)  
3. Requirements: Android 8+, Chrome/Edge latest, institute credentials issued by the office.  
4. Safety: sideload warning — prefer Play Store when listed (W2).

## 3. APK policy

- Never commit APKs to this repo.  
- `apkUrl` points at object storage / GitHub Release / Play.  
- Checksums (SHA-256) optional W2.

## 4. Deep links

If origins exist:

- Admin → `/`  
- Connect → `/login`  
- Transport → driver login  
- Nexus → `/`  

Website should not pass demo passwords in query strings.

## 5. Empty / honest states

If all APKs are null, the page is still useful (web CTAs + “Android builds will appear here”). Do not invent Play Store ratings.
