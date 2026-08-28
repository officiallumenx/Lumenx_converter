import type { TransportSettings } from "@/lib/transport-store";
import type { TransportListStatus } from "./load";
import type { TransportInstituteGateStatus } from "./list-view";

export type TransportSettingsLoadStatus = TransportListStatus;

export type TransportSettingsLoadState = {
  status: TransportSettingsLoadStatus;
  settings: TransportSettings | null;
  errorMessage: string | null;
};

export type ResolveTransportSettingsViewInput = {
  apiMode: boolean;
  instituteStatus: TransportInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedSettings: TransportSettings | null;
  storedStatus: TransportSettingsLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type TransportSettingsView = {
  status: TransportSettingsLoadStatus;
  settings: TransportSettings | null;
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveTransportSettingsView(
  input: ResolveTransportSettingsViewInput,
): TransportSettingsView {
  if (!input.apiMode) {
    return {
      status: "demo",
      settings: input.storedSettings,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      settings: null,
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
      settings: null,
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
      settings: null,
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      settings: null,
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    settings: input.storedSettings,
    errorMessage: input.storedErrorMessage,
    rowsValid: input.storedStatus === "ready" && input.storedSettings != null,
  };
}

export function shouldCommitTransportSettingsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
