/**
 * Demo login hints — resolved live from ops bridge driver accounts.
 * Kept for backwards-compatible imports; prefer listDemoDriverHints().
 */

import { listDemoDriverHints } from "./driver-assignment";

/** @deprecated Prefer listDemoDriverHints() for multi-driver demos. */
export function getDemoRouteSetupAccount() {
  const hints = listDemoDriverHints();
  const first = hints[0];
  if (!first) {
    return {
      label: "Demo driver",
      phoneDisplay: "—",
      phoneDigits: "",
      otp: "",
      driverName: "—",
      employeeId: "—",
      busNumber: "—",
      vehicleId: "",
      routeName: "—",
      adminRouteId: "",
      notes: [
        "No active Transport driver accounts in the ops bridge yet.",
        "Create a driver account in Admin → Transport first.",
      ] as string[],
    };
  }
  return {
    label: "Demo driver",
    phoneDisplay: first.phoneDisplay,
    phoneDigits: first.phoneDigits,
    otp: first.otp,
    driverName: first.name,
    employeeId: "—",
    busNumber: first.busNumber,
    vehicleId: "",
    routeName: first.routeLabel,
    adminRouteId: "",
    notes: [
      "Sign in with any listed demo phone + OTP.",
      "Switching phones loads that driver's bus, route, and students.",
    ] as string[],
  };
}

/** @deprecated Prefer listDemoDriverHints(). */
export const DEMO_ROUTE_SETUP_ACCOUNT = getDemoRouteSetupAccount();
