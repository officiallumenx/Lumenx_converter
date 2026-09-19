import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TransportEmergency } from "@lumenx/utils";

import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import {
  inboxItemDtosToTransportNotifications,
  listInboxNotifications,
} from "@/lib/notification-inbox";
import type { DriverAssignment } from "@/lib/transport/driver-assignment";
import {
  loadApiDriverAssignment,
  loadDriverRosterForHydrate,
} from "@/lib/transport/driver-assignment-api";
import { setAttendanceVehicleScope } from "@/lib/transport/attendance/store";
import { setApiTransportNotifications } from "@/lib/transport/alerts/store";
import {
  emergencyRepository,
  refreshApiOpenEmergency,
} from "@/lib/transport/emergency";
import { hydrateRouteSetupFromApi } from "@/lib/transport/route-setup/api-sync";
import {
  getRouteSetupDriverScope,
  setRouteSetupDriverScope,
} from "@/lib/transport/route-setup/store";
import { tripRepository } from "@/lib/transport/trip/repository";
import { attendanceRepository } from "@/lib/transport/attendance/repository";
import type { TransportNotification } from "@/lib/transport/types";
import "@/lib/transport/gps-ping";

import { transportQueryKeys } from "./keys";

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

const NOT_FOUND: DriverAssignment = {
  status: "not_found",
  account: null,
  driver: null,
  bus: null,
  route: null,
  studentCount: 0,
  lockedByAdmin: false,
  tripAssignment: null,
  message: "Could not load driver assignment from API.",
};

export const INBOX_POLL_MS = 45_000;
export const EMERGENCY_POLL_MS = 15_000;

async function fetchDriverAssignment(input: {
  instituteId: string;
  driverId: string;
  displayName: string;
  phone: string;
  employeeId: string;
}): Promise<DriverAssignment> {
  try {
    return await loadApiDriverAssignment(input);
  } catch {
    return NOT_FOUND;
  }
}

/**
 * Live assignment for the signed-in driver (TanStack Query).
 * Keeps route-setup, trip, and attendance scope aligned with this driver.
 */
export function useDriverAssignmentQuery(): DriverAssignment {
  const { user, hydrated } = useTransportAuth();
  const queryClient = useQueryClient();
  const instituteId = user?.instituteId ?? null;
  const driverId = user?.driverId ?? null;

  const query = useQuery({
    queryKey: transportQueryKeys.assignment(instituteId ?? "_", driverId ?? "_"),
    queryFn: () =>
      fetchDriverAssignment({
        instituteId: instituteId!,
        driverId: driverId!,
        displayName: user!.name,
        phone: user!.phone,
        employeeId: user!.employeeId,
      }),
    enabled: hydrated && Boolean(instituteId && driverId),
  });

  const assignment = !hydrated
    ? LOADING
    : query.isPending && !query.data
      ? LOADING
      : (query.data ?? LOADING);

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
  const driverPhone = assignment.driver?.phone ?? user?.phone ?? null;

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
        instituteId: instituteId ?? undefined,
      };
      setRouteSetupDriverScope(scope);
      setAttendanceVehicleScope(vehicleId);
      if (instituteId) {
        void loadDriverRosterForHydrate(instituteId).then((roster) =>
          hydrateRouteSetupFromApi(scope, roster),
        );
        void queryClient.invalidateQueries({
          queryKey: transportQueryKeys.roster(instituteId),
        });
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
    instituteId,
    queryClient,
  ]);

  return assignment;
}

export function useEnsureDriverScope(): () => void {
  const assignment = useDriverAssignmentQuery();
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

/** Driver notification inbox — feeds alerts store + RQ cache. Polls at INBOX_POLL_MS. */
export function useInboxQuery(instituteId: string | null | undefined) {
  const queryClient = useQueryClient();
  const apiMode = isApiAuthMode();
  const enabled = Boolean(apiMode && instituteId);

  const query = useQuery({
    queryKey: transportQueryKeys.inbox(instituteId ?? "_"),
    queryFn: async (): Promise<TransportNotification[]> => {
      try {
        const rows = await listInboxNotifications({ instituteId: instituteId! });
        const mapped = inboxItemDtosToTransportNotifications(rows);
        setApiTransportNotifications(mapped);
        return mapped;
      } catch {
        setApiTransportNotifications([]);
        return [];
      }
    },
    enabled,
    refetchInterval: enabled ? INBOX_POLL_MS : false,
  });

  useEffect(() => {
    if (!enabled) {
      setApiTransportNotifications([]);
    }
  }, [enabled]);

  const refresh = useCallback(() => {
    if (!instituteId) return;
    void queryClient.invalidateQueries({
      queryKey: transportQueryKeys.inbox(instituteId),
    });
  }, [instituteId, queryClient]);

  return { ...query, refresh };
}

/** Open + history emergencies — refreshes API cache into emergency store. */
export function useEmergenciesQuery(
  instituteId: string | null | undefined,
  vehicleId?: string | null,
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(instituteId);

  const query = useQuery({
    queryKey: transportQueryKeys.emergency(instituteId ?? "_", vehicleId ?? "_"),
    queryFn: async (): Promise<TransportEmergency[]> => {
      await refreshApiOpenEmergency();
      return emergencyRepository.list();
    },
    enabled,
    refetchInterval: enabled ? EMERGENCY_POLL_MS : false,
  });

  const refresh = useCallback(() => {
    if (!instituteId) return;
    void queryClient.invalidateQueries({
      queryKey: transportQueryKeys.emergency(instituteId, vehicleId ?? "_"),
    });
  }, [instituteId, vehicleId, queryClient]);

  return { ...query, refresh };
}

/** Driver roster / route-setup hydration. Soft refresh via invalidateQueries. */
export function useDriverRosterQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const canRun = Boolean(instituteId) && enabled;

  const query = useQuery({
    queryKey: transportQueryKeys.roster(instituteId ?? "_"),
    queryFn: async () => {
      const roster = await loadDriverRosterForHydrate(instituteId!);
      const scope = getRouteSetupDriverScope();
      if (scope?.instituteId === instituteId) {
        await hydrateRouteSetupFromApi(scope, roster);
      }
      return roster;
    },
    enabled: canRun,
  });

  const refresh = useCallback(() => {
    if (!instituteId) return;
    void queryClient.invalidateQueries({
      queryKey: transportQueryKeys.roster(instituteId),
    });
  }, [instituteId, queryClient]);

  return { ...query, refresh };
}
