import type { MembershipListItem, RoleCatalogItem } from "./types";
import type { IdentityListStatus } from "./load";

export type IdentityInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export function resolveMembershipsListView(input: {
  apiMode: boolean;
  instituteStatus: IdentityInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: MembershipListItem[];
  storedStatus: IdentityListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: IdentityListStatus;
  items: MembershipListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }
  if (input.instituteStatus === "loading") {
    return { status: "loading", items: [], errorMessage: null, rowsValid: false };
  }
  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
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
    return { status: "needs_institute", items: [], errorMessage: null, rowsValid: false };
  }
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return { status: "loading", items: [], errorMessage: null, rowsValid: false };
  }
  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitIdentityLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}

export function resolveRolesCatalogView(input: {
  apiMode: boolean;
  storedItems: RoleCatalogItem[];
  storedStatus: Exclude<IdentityListStatus, "needs_institute">;
  storedErrorMessage: string | null;
}): {
  status: Exclude<IdentityListStatus, "needs_institute">;
  items: RoleCatalogItem[];
  errorMessage: string | null;
  rowsValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }
  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: input.storedStatus === "ready" || input.storedStatus === "empty",
  };
}
