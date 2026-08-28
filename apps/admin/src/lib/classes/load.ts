/**
 * Dual-mode classes directory list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog, getClass, getSection } from "./api";
import { sectionsToListItems, sectionDtoToDetailItem } from "./map";
import type { ClassListItem, SectionDetailItem } from "./types";

export type ClassesListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type ClassesListState = {
  status: ClassesListStatus;
  items: ClassListItem[];
  errorMessage: string | null;
};

export type SectionDetailState = {
  status: ClassesListStatus;
  section: SectionDetailItem | null;
  errorMessage: string | null;
};

export async function loadSectionDetail(
  sectionId: string,
): Promise<SectionDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", section: null, errorMessage: null };
  }

  if (!sectionId?.trim()) {
    return { status: "error", section: null, errorMessage: "Section id is required." };
  }

  if (!isInstituteUuid(sectionId.trim())) {
    return {
      status: "error",
      section: null,
      errorMessage: "Section id must be a valid UUID.",
    };
  }

  try {
    const section = await getSection(sectionId.trim());
    const cls = await getClass(section.classId);
    return {
      status: "ready",
      section: sectionDtoToDetailItem(section, cls),
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
    const message = err instanceof Error ? err.message : "Failed to load section";

    if (status === 403) {
      return { status: "forbidden", section: null, errorMessage: message };
    }
    if (status === 404) {
      return { status: "empty", section: null, errorMessage: "Section not found." };
    }
    return { status: "error", section: null, errorMessage: message };
  }
}

export async function loadClassesList(
  activeInstituteId: string | null,
): Promise<ClassesListState> {
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
    const { sections, classes } = await listClassesCatalog({
      instituteId: activeInstituteId,
    });
    const items = sectionsToListItems(sections, classes);
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
      err instanceof Error ? err.message : "Failed to load classes";

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
