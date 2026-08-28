import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  GeneratedDocument,
  TemplateRecord,
} from "@/lib/template-management/types";
import { listDocumentTemplates, listGeneratedDocuments } from "./api";
import {
  documentTemplateDtosToTemplateRecords,
  generatedDocumentDtosToGeneratedDocuments,
} from "./map";

export type DocumentsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type DocumentsTemplatesListStatus = DocumentsListStatus;
export type DocumentsGeneratedListStatus = DocumentsListStatus;

export type DocumentsTemplatesListState = {
  status: DocumentsTemplatesListStatus;
  items: TemplateRecord[];
  errorMessage: string | null;
};

export type DocumentsGeneratedListState = {
  status: DocumentsGeneratedListStatus;
  items: GeneratedDocument[];
  errorMessage: string | null;
};

async function loadDocumentsList<T>(
  activeInstituteId: string | null,
  fetchRows: (instituteId: string) => Promise<unknown[]>,
  mapRows: (rows: unknown[]) => T[],
  errorLabel: string,
): Promise<{ status: DocumentsListStatus; items: T[]; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const rows = await fetchRows(activeInstituteId);
    const items = mapRows(rows);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message =
      err instanceof Error ? err.message : `Failed to load ${errorLabel}`;

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}

export async function loadDocumentsTemplatesList(
  activeInstituteId: string | null,
): Promise<DocumentsTemplatesListState> {
  const result = await loadDocumentsList(
    activeInstituteId,
    (instituteId) => listDocumentTemplates({ instituteId }),
    (rows) => documentTemplateDtosToTemplateRecords(rows as never[]),
    "document templates",
  );
  return result;
}

export async function loadDocumentsGeneratedList(
  activeInstituteId: string | null,
): Promise<DocumentsGeneratedListState> {
  const result = await loadDocumentsList(
    activeInstituteId,
    (instituteId) => listGeneratedDocuments({ instituteId }),
    (rows) => generatedDocumentDtosToGeneratedDocuments(rows as never[]),
    "generated documents",
  );
  return result;
}
