import type {
  AdmissionApplicationListItem,
  AdmissionOpeningListItem,
  AdmissionProgramListItem,
} from "./types";
import type {
  AdmissionsListStatus,
  AdmissionsOpeningsListStatus,
  AdmissionsProgramsListStatus,
} from "./load";

export type AdmissionsInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

type ResolveAdmissionsResourceListViewInput<T> = {
  apiMode: boolean;
  instituteStatus: AdmissionsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: T[];
  storedStatus: AdmissionsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

type AdmissionsResourceListView<T> = {
  status: AdmissionsListStatus;
  items: T[];
  errorMessage: string | null;
  rowsValid: boolean;
};

function resolveAdmissionsResourceListView<T>(
  input: ResolveAdmissionsResourceListViewInput<T>,
): AdmissionsResourceListView<T> {
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

export type ResolveAdmissionsListViewInput =
  ResolveAdmissionsResourceListViewInput<AdmissionApplicationListItem> & {
    storedStatus: AdmissionsListStatus;
  };

export type AdmissionsListView = AdmissionsResourceListView<AdmissionApplicationListItem>;

export function resolveAdmissionsListView(
  input: ResolveAdmissionsListViewInput,
): AdmissionsListView {
  return resolveAdmissionsResourceListView(input);
}

export type ResolveAdmissionsProgramsListViewInput =
  ResolveAdmissionsResourceListViewInput<AdmissionProgramListItem> & {
    storedStatus: AdmissionsProgramsListStatus;
  };

export type AdmissionsProgramsListView =
  AdmissionsResourceListView<AdmissionProgramListItem>;

export function resolveAdmissionsProgramsListView(
  input: ResolveAdmissionsProgramsListViewInput,
): AdmissionsProgramsListView {
  return resolveAdmissionsResourceListView(input);
}

export type ResolveAdmissionsOpeningsListViewInput =
  ResolveAdmissionsResourceListViewInput<AdmissionOpeningListItem> & {
    storedStatus: AdmissionsOpeningsListStatus;
  };

export type AdmissionsOpeningsListView =
  AdmissionsResourceListView<AdmissionOpeningListItem>;

export function resolveAdmissionsOpeningsListView(
  input: ResolveAdmissionsOpeningsListViewInput,
): AdmissionsOpeningsListView {
  return resolveAdmissionsResourceListView(input);
}

export function shouldCommitAdmissionsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}

export function shouldCommitAdmissionsProgramsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  return shouldCommitAdmissionsLoad(opts);
}

export function shouldCommitAdmissionsOpeningsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  return shouldCommitAdmissionsLoad(opts);
}
