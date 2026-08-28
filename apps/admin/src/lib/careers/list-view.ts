import type { CareerApplicationListItem, CareerJobListItem } from "./types";
import type { CareersJobsListStatus, CareersListStatus } from "./load";

export type CareersInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

type ResolveCareersResourceListViewInput<T> = {
  apiMode: boolean;
  instituteStatus: CareersInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: T[];
  storedStatus: CareersListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

type CareersResourceListView<T> = {
  status: CareersListStatus;
  items: T[];
  errorMessage: string | null;
  rowsValid: boolean;
};

function resolveCareersResourceListView<T>(
  input: ResolveCareersResourceListViewInput<T>,
): CareersResourceListView<T> {
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

export type ResolveCareersListViewInput =
  ResolveCareersResourceListViewInput<CareerApplicationListItem> & {
    storedStatus: CareersListStatus;
  };

export type CareersListView = CareersResourceListView<CareerApplicationListItem>;

export function resolveCareersListView(
  input: ResolveCareersListViewInput,
): CareersListView {
  return resolveCareersResourceListView(input);
}

export type ResolveCareerJobsListViewInput =
  ResolveCareersResourceListViewInput<CareerJobListItem> & {
    storedStatus: CareersJobsListStatus;
  };

export type CareerJobsListView = CareersResourceListView<CareerJobListItem>;

export function resolveCareerJobsListView(
  input: ResolveCareerJobsListViewInput,
): CareerJobsListView {
  return resolveCareersResourceListView(input);
}

export function shouldCommitCareersLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}

export function shouldCommitCareerJobsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  return shouldCommitCareersLoad(opts);
}
