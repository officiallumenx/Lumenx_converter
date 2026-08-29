import type { InstituteDto, InstituteSettingsDto } from "./types";
import type { InstituteProfileStatus } from "./profile-load";

export function resolveInstituteProfileView(input: {
  apiMode: boolean;
  instituteStatus:
    | "demo"
    | "loading"
    | "ready"
    | "needs_selection"
    | "empty"
    | "forbidden"
    | "error";
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedInstitute: InstituteDto | null;
  storedSettings: InstituteSettingsDto | null;
  storedStatus: InstituteProfileStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: InstituteProfileStatus;
  institute: InstituteDto | null;
  settings: InstituteSettingsDto | null;
  errorMessage: string | null;
  detailValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      institute: input.storedInstitute,
      settings: input.storedSettings,
      errorMessage: null,
      detailValid: true,
    };
  }
  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      institute: null,
      settings: null,
      errorMessage: null,
      detailValid: false,
    };
  }
  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      institute: null,
      settings: null,
      errorMessage: input.instituteErrorMessage,
      detailValid: false,
    };
  }
  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: "needs_institute",
      institute: null,
      settings: null,
      errorMessage: null,
      detailValid: false,
    };
  }
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      institute: null,
      settings: null,
      errorMessage: null,
      detailValid: false,
    };
  }
  return {
    status: input.storedStatus,
    institute: input.storedInstitute,
    settings: input.storedSettings,
    errorMessage: input.storedErrorMessage,
    detailValid: input.storedStatus === "ready",
  };
}

export function shouldCommitInstituteProfileLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
