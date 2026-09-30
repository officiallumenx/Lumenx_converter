/**
 * Shared institute-scope gate for Admin list/detail views.
 * Keeps last-good cached rows visible while offline or during soft institute reload.
 */

export type InstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type InstituteListGateResult<TStatus extends string, TItem> = {
  status: TStatus;
  items: TItem[];
  errorMessage: string | null;
  rowsValid: boolean;
  /** True when the caller should return storedStatus/items as-is. */
  passThrough: boolean;
};

type GateInput<TStatus extends string, TItem> = {
  apiMode: boolean;
  instituteStatus: InstituteGateStatus | string;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: TItem[];
  storedStatus: TStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
  /** Status used for demo passthrough (usually "demo"). */
  demoStatus: TStatus;
  /** Status when institute is missing / needs pick. */
  needsInstituteStatus: TStatus;
  loadingStatus: TStatus;
  errorStatus: TStatus;
  forbiddenStatus: TStatus;
  /**
   * Map a non-ready stored status to a paintable status when serving cache
   * during institute error/loading (e.g. "error" → "ready").
   */
  paintStatusFromStored?: (stored: TStatus) => TStatus;
};

function defaultPaintStatus<TStatus extends string>(stored: TStatus): TStatus {
  if (stored === "loading" || stored === "error") {
    return "ready" as TStatus;
  }
  return stored;
}

/**
 * Resolve institute gating for item lists. When institute context is
 * loading/error but we still have rows for the known institute, keep them.
 */
export function resolveInstituteScopedListView<TStatus extends string, TItem>(
  input: GateInput<TStatus, TItem>,
): InstituteListGateResult<TStatus, TItem> {
  const paint = input.paintStatusFromStored ?? defaultPaintStatus;

  if (!input.apiMode) {
    return {
      status: input.demoStatus,
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
      passThrough: false,
    };
  }

  const hasCachedForScope =
    input.storedItems.length > 0 &&
    Boolean(input.resolvedForInstituteId) &&
    (!input.activeInstituteId ||
      input.activeInstituteId === input.resolvedForInstituteId);

  if (input.instituteStatus === "loading") {
    if (hasCachedForScope && input.activeInstituteId) {
      return {
        status: paint(input.storedStatus),
        items: input.storedItems,
        errorMessage: null,
        rowsValid: true,
        passThrough: false,
      };
    }
    return {
      status: input.loadingStatus,
      items: [],
      errorMessage: null,
      rowsValid: false,
      passThrough: false,
    };
  }

  if (input.instituteStatus === "forbidden") {
    return {
      status: input.forbiddenStatus,
      items: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
      passThrough: false,
    };
  }

  if (input.instituteStatus === "error") {
    if (hasCachedForScope) {
      return {
        status: paint(input.storedStatus),
        items: input.storedItems,
        errorMessage: null,
        rowsValid: true,
        passThrough: false,
      };
    }
    return {
      status: input.errorStatus,
      items: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
      passThrough: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: input.needsInstituteStatus,
      items: [],
      errorMessage: null,
      rowsValid: false,
      passThrough: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: input.loadingStatus,
      items: [],
      errorMessage: null,
      rowsValid: false,
      passThrough: false,
    };
  }

  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
    passThrough: true,
  };
}
