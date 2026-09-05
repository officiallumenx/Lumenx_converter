/**
 * Load promotion / graduation rosters from live enrollments + catalog.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAcademicYears } from "@/lib/academic-years/api";
import { listClassesCatalog } from "@/lib/classes/api";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { AcademicYearDto } from "@/lib/academic-years/types";
import { listEnrollments } from "./api";
import { enrollmentDtosToListItems } from "./map";
import type { EnrollmentListItem, EnrollmentStatus } from "./types";

export type ProgressionCatalogState = {
  status: "demo" | "ready" | "needs_institute" | "forbidden" | "error" | "empty";
  years: AcademicYearDto[];
  classes: ClassDto[];
  sections: SectionDto[];
  enrollments: EnrollmentListItem[];
  errorMessage: string | null;
};

export async function loadProgressionCatalog(
  instituteId: string | null,
  academicYearId?: string | null,
): Promise<ProgressionCatalogState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      years: [],
      classes: [],
      sections: [],
      enrollments: [],
      errorMessage: null,
    };
  }
  if (!instituteId || !isInstituteUuid(instituteId)) {
    return {
      status: "needs_institute",
      years: [],
      classes: [],
      sections: [],
      enrollments: [],
      errorMessage: null,
    };
  }
  try {
    const years = await listAcademicYears({ instituteId });
    const yearId =
      academicYearId && isInstituteUuid(academicYearId)
        ? academicYearId
        : years.find((y) => y.status === "active")?.id ?? years[0]?.id ?? null;
    if (!yearId) {
      return {
        status: "empty",
        years,
        classes: [],
        sections: [],
        enrollments: [],
        errorMessage: null,
      };
    }
    const [catalog, rows] = await Promise.all([
      listClassesCatalog({ instituteId }),
      listEnrollments({
        instituteId,
        academicYearId: yearId,
        status: "active" as EnrollmentStatus,
      }),
    ]);
    const classes = catalog.classes.filter((c) => c.academicYearId === yearId);
    const sections = catalog.sections.filter((s) => s.academicYearId === yearId);
    const classesById = new Map(classes.map((c) => [c.id, c]));
    const sectionsById = new Map(sections.map((s) => [s.id, s]));
    const enrollments = enrollmentDtosToListItems(rows, { classesById, sectionsById });
    return {
      status: "ready",
      years,
      classes,
      sections,
      enrollments,
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
      err instanceof Error ? err.message : "Failed to load promotion catalog";
    if (status === 403) {
      return {
        status: "forbidden",
        years: [],
        classes: [],
        sections: [],
        enrollments: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      years: [],
      classes: [],
      sections: [],
      enrollments: [],
      errorMessage: message,
    };
  }
}
