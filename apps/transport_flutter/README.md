# LumenX Transport (Flutter)

Phase 1 **driver-only** app — attendance, route view, notifications, and profile. Transport management is handled in **LumenX Admin**.

## Run

```bash
cd apps/transport_flutter
flutter pub get
flutter run
```

## Architecture

- Phase 1 foundation: [docs/TRANSPORT_FLUTTER_PHASE1.md](../../docs/TRANSPORT_FLUTTER_PHASE1.md)
- Driver conversion: [docs/TRANSPORT_DRIVER_CONVERSION.md](../../docs/TRANSPORT_DRIVER_CONVERSION.md)
- UI audit & alignment: [docs/TRANSPORT_UI_AUDIT_REPORT.md](../../docs/TRANSPORT_UI_AUDIT_REPORT.md) · [docs/TRANSPORT_UI_GAP_REPORT.md](../../docs/TRANSPORT_UI_GAP_REPORT.md)

## Phase 1 includes

- Driver-centric navigation (Home, Attendance, Notifications, Profile)
- Driver Home with assigned route, trips, and attendance status
- Read-only **My Route** view for the signed-in driver
- Unified session (Profile login drives attendance)
- Feature-first folder structure, `go_router`, Riverpod
- Responsive navigation (bottom bar · rail · sidebar)
- LumenX Connect design system (`Lx*` components)
- Mock repositories with demo data (Ramesh Kumar · Route 01)
- Driver authentication (mock): login, OTP, password setup, forgot password — see [docs/DEMO_DRIVER_CREDENTIALS.md](../../docs/DEMO_DRIVER_CREDENTIALS.md)

## Phase 2+ (not in scope)

- GPS / maps
- Offline mode
- Auth API / persistent session storage
- Fleet dispatch (Admin)
