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
import {
  deriveDocumentCategories,
  summarizeDocumentsHub,
  type DocumentsCategoryRow,
  type DocumentsHubKpis,
} from "./hub-summary";
import type { GeneratedWorkflowState } from "./types";

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
  opts?: { workflowState?: GeneratedWorkflowState },
): Promise<DocumentsGeneratedListState> {
  const result = await loadDocumentsList(
    activeInstituteId,
    (instituteId) =>
      listGeneratedDocuments({
        instituteId,
        workflowState: opts?.workflowState,
      }),
    (rows) => generatedDocumentDtosToGeneratedDocuments(rows as never[]),
    "generated documents",
  );
  return result;
}

export async function loadDocumentsPublishedList(
  activeInstituteId: string | null,
): Promise<DocumentsGeneratedListState> {
  return loadDocumentsGeneratedList(activeInstituteId, {
    workflowState: "published",
  });
}

export type DocumentsHubSummaryState = {
  status: DocumentsListStatus;
  kpis: DocumentsHubKpis;
  recentGenerated: GeneratedDocument[];
  categories: DocumentsCategoryRow[];
  errorMessage: string | null;
};

export async function loadDocumentsHubSummary(
  activeInstituteId: string | null,
): Promise<DocumentsHubSummaryState> {
  const emptyKpis: DocumentsHubKpis = {
    activeTemplates: 0,
    draftTemplates: 0,
    totalGenerated: 0,
    publishedCount: 0,
    inReviewCount: 0,
    rejectedCount: 0,
  };

  if (!isApiAuthMode()) {
    return {
      status: "demo",
      kpis: emptyKpis,
      recentGenerated: [],
      categories: [],
      errorMessage: null,
    };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      kpis: emptyKpis,
      recentGenerated: [],
      categories: [],
      errorMessage: null,
    };
  }

  try {
    const [templates, generated] = await Promise.all([
      listDocumentTemplates({ instituteId: activeInstituteId }),
      listGeneratedDocuments({ instituteId: activeInstituteId }),
    ]);
    const templateRecords = documentTemplateDtosToTemplateRecords(templates);
    const generatedDocs = generatedDocumentDtosToGeneratedDocuments(generated);
    const kpis = summarizeDocumentsHub({
      templates: templateRecords,
      generated: generatedDocs,
    });
    const categories = deriveDocumentCategories(templateRecords);
    const recentGenerated = [...generatedDocs]
      .sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1))
      .slice(0, 8);
    const empty = templateRecords.length === 0 && generatedDocs.length === 0;
    return {
      status: empty ? "empty" : "ready",
      kpis,
      recentGenerated,
      categories,
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
      err instanceof Error ? err.message : "Failed to load documents hub";

    if (status === 403) {
      return {
        status: "forbidden",
        kpis: emptyKpis,
        recentGenerated: [],
        categories: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      kpis: emptyKpis,
      recentGenerated: [],
      categories: [],
      errorMessage: message,
    };
  }
}
