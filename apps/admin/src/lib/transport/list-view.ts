import type { TransportDriver, TransportVehicle } from "@/lib/transport-store";
import type { TransportDriversListStatus, TransportListStatus, TransportVehiclesListStatus } from "./load";

export type TransportInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

type ResolveTransportListViewInput<T> = {
  apiMode: boolean;
  instituteStatus: TransportInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: T[];
  storedStatus: TransportListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

type TransportListView<T> = {
  status: TransportListStatus;
  items: T[];
  errorMessage: string | null;
  rowsValid: boolean;
};

function resolveTransportListView<T>(
  input: ResolveTransportListViewInput<T>,
): TransportListView<T> {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "error" ||
    input.instituteStatus === "forbidden"
  ) {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      items: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export type ResolveTransportVehiclesListViewInput = ResolveTransportListViewInput<TransportVehicle> & {
  storedStatus: TransportVehiclesListStatus;
};

export type TransportVehiclesListView = TransportListView<TransportVehicle>;

export function resolveTransportVehiclesListView(
  input: ResolveTransportVehiclesListViewInput,
): TransportVehiclesListView {
  return resolveTransportListView(input);
}

export type ResolveTransportDriversListViewInput = ResolveTransportListViewInput<TransportDriver> & {
  storedStatus: TransportDriversListStatus;
};

export type TransportDriversListView = TransportListView<TransportDriver>;

export function resolveTransportDriversListView(
  input: ResolveTransportDriversListViewInput,
): TransportDriversListView {
  return resolveTransportListView(input);
}

export function shouldCommitTransportVehiclesLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}

export function shouldCommitTransportDriversLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  return shouldCommitTransportVehiclesLoad(opts);
}
