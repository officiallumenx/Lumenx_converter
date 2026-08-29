import type { AlertFireDto, AlertRuleDto } from "./types";
import type { AlertRulesLoadStatus } from "./load";

export function resolveAlertRulesView(input: {
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
  storedRules: AlertRuleDto[];
  storedFired: AlertFireDto[];
  storedStatus: AlertRulesLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: AlertRulesLoadStatus;
  rules: AlertRuleDto[];
  fired: AlertFireDto[];
  errorMessage: string | null;
  rowsValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      rules: input.storedRules,
      fired: input.storedFired,
      errorMessage: null,
      rowsValid: true,
    };
  }
  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      rules: [],
      fired: [],
      errorMessage: null,
      rowsValid: false,
    };
  }
  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      rules: [],
      fired: [],
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
      rules: [],
      fired: [],
      errorMessage: null,
      rowsValid: false,
    };
  }
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      rules: [],
      fired: [],
      errorMessage: null,
      rowsValid: false,
    };
  }
  return {
    status: input.storedStatus,
    rules: input.storedRules,
    fired: input.storedFired,
    errorMessage: input.storedErrorMessage,
    rowsValid: input.storedStatus === "ready" || input.storedStatus === "empty",
  };
}

export function shouldCommitAlertRulesLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
