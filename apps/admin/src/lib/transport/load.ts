import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import type { TransportDriver, TransportRoute, TransportSettings, TransportVehicle } from "@/lib/transport-store";
import { getTransportSettings, listTransportDrivers, listTransportEnrollments, listTransportRoutes, listTransportStops, listTransportVehicles } from "./api";
import {
  driverDtosToTransportDrivers,
  enrollmentDtosToListItems,
  routeDtosToTransportRoutes,
  transportSettingsDtoToTransportSettings,
  vehicleDtosToTransportVehicles,
} from "./map";
import type { TransportEnrollmentListItem } from "./types";
import { listStudents } from "@/lib/students/api";
import { studentDtosToListItems } from "@/lib/students/map";
import type { StudentListItem } from "@/lib/students/types";

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
export type TransportRoutesListStatus = TransportListStatus;
export type TransportEnrollmentsListStatus = TransportListStatus;
export type TransportSettingsLoadStatus = TransportListStatus;

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

export type TransportRoutesListState = {
  status: TransportRoutesListStatus;
  items: TransportRoute[];
  errorMessage: string | null;
};

export type TransportEnrollmentsListState = {
  status: TransportEnrollmentsListStatus;
  items: TransportEnrollmentListItem[];
  errorMessage: string | null;
};

export type TransportSettingsLoadState = {
  status: TransportSettingsLoadStatus;
  settings: TransportSettings | null;
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

export async function loadTransportRoutesList(
  activeInstituteId: string | null,
): Promise<TransportRoutesListState> {
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
    const rows = await listTransportRoutes({ instituteId: activeInstituteId });
    const items = await routeDtosToTransportRoutes(rows, (routeId) =>
      listTransportStops({ routeId }),
    );
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
    const message =
      err instanceof Error ? err.message : "Failed to load transport routes";

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

async function loadTransportRoutesForInstitute(
  activeInstituteId: string,
): Promise<TransportRoute[]> {
  const rows = await listTransportRoutes({ instituteId: activeInstituteId });
  return routeDtosToTransportRoutes(rows, (routeId) =>
    listTransportStops({ routeId }),
  );
}

export async function loadTransportEnrollmentsList(
  activeInstituteId: string | null,
): Promise<TransportEnrollmentsListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const [rows, routes, students] = await Promise.all([
      listTransportEnrollments({ instituteId: activeInstituteId }),
      loadTransportRoutesForInstitute(activeInstituteId),
      studentDtosToListItems(await listStudents({ instituteId: activeInstituteId })),
    ]);
    const studentsById = new Map<string, StudentListItem>(
      students.map((student) => [student.id, student]),
    );
    const items = enrollmentDtosToListItems(rows, studentsById, routes);
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
    const message =
      err instanceof Error ? err.message : "Failed to load transport enrollments";

    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}

export async function loadTransportSettings(
  activeInstituteId: string | null,
): Promise<TransportSettingsLoadState> {
  if (!isApiAuthMode()) {
    return { status: "demo", settings: null, errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      settings: null,
      errorMessage: null,
    };
  }

  try {
    const dto = await getTransportSettings({ instituteId: activeInstituteId });
    return {
      status: "ready",
      settings: transportSettingsDtoToTransportSettings(dto),
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
    const message =
      err instanceof Error ? err.message : "Failed to load transport settings";

    if (status === 403) {
      return {
        status: "forbidden",
        settings: null,
        errorMessage: message,
      };
    }
    return {
      status: "error",
      settings: null,
      errorMessage: message,
    };
  }
}
