import type { InstituteSubscriptionCurrentDto } from "./types";
import type { SubscriptionLoadStatus } from "./load";

export function resolveSubscriptionCurrentView(input: {
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
  storedSubscription: InstituteSubscriptionCurrentDto | null;
  storedStatus: SubscriptionLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: SubscriptionLoadStatus;
  subscription: InstituteSubscriptionCurrentDto | null;
  errorMessage: string | null;
  rowsValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      subscription: input.storedSubscription,
      errorMessage: null,
      rowsValid: true,
    };
  }
  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      subscription: null,
      errorMessage: null,
      rowsValid: false,
    };
  }
  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      subscription: null,
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
      subscription: null,
      errorMessage: null,
      rowsValid: false,
    };
  }
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      subscription: null,
      errorMessage: null,
      rowsValid: false,
    };
  }
  return {
    status: input.storedStatus,
    subscription: input.storedSubscription,
    errorMessage: input.storedErrorMessage,
    rowsValid: input.storedStatus === "ready",
  };
}

export function shouldCommitSubscriptionLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
