import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import type { TransportDriver, TransportVehicle } from "@/lib/transport-store";
import { listTransportDrivers, listTransportVehicles } from "./api";
import { driverDtosToTransportDrivers, vehicleDtosToTransportVehicles } from "./map";

export type TransportListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type TransportVehiclesListStatus = TransportListStatus;
export type TransportDriversListStatus = TransportListStatus;

export type TransportVehiclesListState = {
  status: TransportVehiclesListStatus;
  items: TransportVehicle[];
  errorMessage: string | null;
};

export type TransportDriversListState = {
  status: TransportDriversListStatus;
  items: TransportDriver[];
  errorMessage: string | null;
};

async function loadTransportResourceList<T>(
  activeInstituteId: string | null,
  fetchRows: (instituteId: string) => Promise<unknown[]>,
  mapRows: (rows: unknown[]) => T[],
  errorLabel: string,
): Promise<{ status: TransportListStatus; items: T[]; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const rows = await fetchRows(activeInstituteId);
    const items = mapRows(rows);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : errorLabel;

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}

export async function loadTransportVehiclesList(
  activeInstituteId: string | null,
): Promise<TransportVehiclesListState> {
  return loadTransportResourceList(
    activeInstituteId,
    (instituteId) => listTransportVehicles({ instituteId }),
    (rows) => vehicleDtosToTransportVehicles(rows as Parameters<typeof vehicleDtosToTransportVehicles>[0]),
    "Failed to load transport vehicles",
  );
}

export async function loadTransportDriversList(
  activeInstituteId: string | null,
): Promise<TransportDriversListState> {
  return loadTransportResourceList(
    activeInstituteId,
    (instituteId) => listTransportDrivers({ instituteId }),
    (rows) => driverDtosToTransportDrivers(rows as Parameters<typeof driverDtosToTransportDrivers>[0]),
    "Failed to load transport drivers",
  );
}
