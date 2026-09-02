import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import {
  resolveDriverAssignment,
  subscribeDriverAssignment,
  type DriverAssignment,
} from "@/lib/transport/driver-assignment";
import {
  loadApiDriverAssignment,
  loadDriverRosterForHydrate,
} from "@/lib/transport/driver-assignment-api";
import { setAttendanceVehicleScope } from "@/lib/transport/attendance/store";
import { setRouteSetupDriverScope } from "@/lib/transport/route-setup/store";
import { hydrateRouteSetupFromApi } from "@/lib/transport/route-setup/api-sync";
import { tripRepository } from "@/lib/transport/trip/repository";
import { attendanceRepository } from "@/lib/transport/attendance/repository";
import "@/lib/transport/gps-ping";

function getSnapshot(phone: string | null): DriverAssignment {
  return resolveDriverAssignment(phone);
}

const LOADING: DriverAssignment = {
  status: "loading",
  account: null,
  driver: null,
  bus: null,
  route: null,
  studentCount: 0,
  lockedByAdmin: false,
  tripAssignment: null,
  message: "Loading assignment…",
};

/**
 * Live assignment for the signed-in driver (ops bridge or API).
 * Keeps route-setup, trip, and attendance scope aligned with this driver.
 */
export function useDriverAssignment(): DriverAssignment {
  const { user, hydrated } = useTransportAuth();
  const phone = user?.phone ?? null;
  const apiMode = isApiAuthMode();
  const [apiAssignment, setApiAssignment] = useState<DriverAssignment | null>(null);

  const demoAssignment = useSyncExternalStore(
    subscribeDriverAssignment,
    () => getSnapshot(phone),
    () => LOADING,
  );

  const loadApi = useCallback(async () => {
    if (!apiMode || !user?.instituteId || !user.driverId) {
      setApiAssignment(null);
      return;
    }
    try {
      const next = await loadApiDriverAssignment({
        instituteId: user.instituteId,
        driverId: user.driverId,
        displayName: user.name,
        phone: user.phone,
        employeeId: user.employeeId,
      });
      setApiAssignment(next);
    } catch {
      setApiAssignment({
        status: "not_found",
        account: null,
        driver: null,
        bus: null,
        route: null,
        studentCount: 0,
        lockedByAdmin: false,
        tripAssignment: null,
        message: "Could not load driver assignment from API.",
      });
    }
  }, [apiMode, user]);

  useEffect(() => {
    if (!hydrated || !apiMode) return;
    void loadApi();
  }, [hydrated, apiMode, loadApi]);

  const assignment = apiMode ? (apiAssignment ?? LOADING) : demoAssignment;

  const status = assignment.status;
  const accountId = assignment.account?.id ?? null;
  const vehicleId = assignment.bus?.vehicleId ?? null;
  const routeId = assignment.route?.adminRouteId ?? null;
  const routeCode = assignment.route?.code ?? null;
  const routeName = assignment.route?.name ?? null;
  const busNumber = assignment.bus?.busNumber ?? null;
  const driverName = assignment.account?.name ?? null;
  const employeeId = assignment.account?.employeeId ?? null;
  const licenseNumber = assignment.account?.licenseNumber ?? null;
  const driverPhone = assignment.driver?.phone ?? phone;

  useEffect(() => {
    if (!hydrated) return;

    if (
      status === "ready" &&
      accountId &&
      vehicleId &&
      routeId &&
      routeCode &&
      routeName &&
      busNumber &&
      driverName &&
      employeeId &&
      licenseNumber
    ) {
      const scope = {
        routeId,
        routeCode,
        routeName,
        vehicleId,
        vehicleNumber: busNumber,
        driverId: accountId,
        driverName,
        driverPhone: driverPhone ?? "—",
        employeeId,
        licenseNumber,
        instituteId: user?.instituteId,
      };
      setRouteSetupDriverScope(scope);
      setAttendanceVehicleScope(vehicleId);
      if (apiMode && user?.instituteId) {
        void loadDriverRosterForHydrate(user.instituteId).then((roster) =>
          hydrateRouteSetupFromApi(scope, roster),
        );
        void tripRepository.hydrateFromApi().then(() => attendanceRepository.hydrateFromApi());
      }
      return;
    }

    setAttendanceVehicleScope(vehicleId);
  }, [
    hydrated,
    status,
    accountId,
    vehicleId,
    routeId,
    routeCode,
    routeName,
    busNumber,
    driverName,
    employeeId,
    licenseNumber,
    driverPhone,
    user?.instituteId,
    apiMode,
  ]);

  if (!hydrated) return LOADING;
  return assignment;
}

export function useEnsureDriverScope(): () => void {
  const assignment = useDriverAssignment();
  const { user } = useTransportAuth();
  return useCallback(() => {
    if (assignment.status === "ready" && assignment.account && assignment.bus && assignment.route) {
      setRouteSetupDriverScope({
        routeId: assignment.route.adminRouteId,
        routeCode: assignment.route.code,
        routeName: assignment.route.name,
        vehicleId: assignment.bus.vehicleId,
        vehicleNumber: assignment.bus.busNumber,
        driverId: assignment.account.id,
        driverName: assignment.account.name,
        driverPhone: assignment.driver?.phone ?? "—",
        employeeId: assignment.account.employeeId,
        licenseNumber: assignment.account.licenseNumber,
        instituteId: user?.instituteId,
      });
      setAttendanceVehicleScope(assignment.bus.vehicleId);
    }
  }, [assignment, user?.instituteId]);
}
