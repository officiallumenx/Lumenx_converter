# LumenX Transport

Brand-new LumenX ecosystem app for school transport operations.

Stack matches **LumenX Connect**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Router / Start, Capacitor.

## Commands

From the monorepo root:

```bash
npm run dev:transport
npm run build:transport
```

From this package:

```bash
npm run dev
npm run build
npm run build:capacitor
npm run lint
npm run format
npm run cap:sync
npm run cap:open:android
```

### Android (Capacitor)

```bash
# 1) Build the web bundle into dist/
npm run build:capacitor

# 2) Copy assets + plugins into the native project
npm run cap:sync

# 3) Open in Android Studio
npm run cap:open:android
```

App id: `com.lumenx.app.transport`. Native shell handles Android back navigation and safe-area insets.

## Architecture

- **UI:** `src/features/*` (screens) + `src/components/*` (shared UI)
- **Data layer:** `src/lib/transport/*` — Connect-style repositories/stores with a single mock seed
- Swap repository implementations for real APIs without changing page workflows

## Notes

- Driver app screens are mock-backed (no backend yet).
- Do not migrate from `apps/transport_flutter`.
- Alias `@/*` → `./src/*`.
- Bottom nav label **Alerts** maps to route `/notifications` (page title: Notifications).
