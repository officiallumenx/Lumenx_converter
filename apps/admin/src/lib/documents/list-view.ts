import type {
  GeneratedDocument,
  TemplateRecord,
} from "@/lib/template-management/types";
import type {
  DocumentsGeneratedListStatus,
  DocumentsListStatus,
  DocumentsTemplatesListStatus,
} from "./load";

export type DocumentsInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

type ResolveDocumentsListViewInput<T> = {
  apiMode: boolean;
  instituteStatus: DocumentsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: T[];
  storedStatus: DocumentsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

type DocumentsListView<T> = {
  status: DocumentsListStatus;
  items: T[];
  errorMessage: string | null;
  rowsValid: boolean;
};

function resolveDocumentsListView<T>(
  input: ResolveDocumentsListViewInput<T>,
): DocumentsListView<T> {
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

export type ResolveDocumentsTemplatesListViewInput =
  ResolveDocumentsListViewInput<TemplateRecord> & {
    storedStatus: DocumentsTemplatesListStatus;
  };

export type DocumentsTemplatesListView = DocumentsListView<TemplateRecord>;

export function resolveDocumentsTemplatesListView(
  input: ResolveDocumentsTemplatesListViewInput,
): DocumentsTemplatesListView {
  return resolveDocumentsListView(input);
}

export type ResolveDocumentsGeneratedListViewInput =
  ResolveDocumentsListViewInput<GeneratedDocument> & {
    storedStatus: DocumentsGeneratedListStatus;
  };

export type DocumentsGeneratedListView = DocumentsListView<GeneratedDocument>;

export function resolveDocumentsGeneratedListView(
  input: ResolveDocumentsGeneratedListViewInput,
): DocumentsGeneratedListView {
  return resolveDocumentsListView(input);
}

export function shouldCommitDocumentsTemplatesLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}

export function shouldCommitDocumentsGeneratedLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  return shouldCommitDocumentsTemplatesLoad(opts);
}
