/**
 * Load academic-year enrollment records for API mode (Academic Years "View").
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import { listEnrollments } from "./api";
import { enrollmentDtosToListItems } from "./map";
import type { EnrollmentListItem, EnrollmentStatus } from "./types";

export type YearRecordUiStatus = "Active" | "Transferred" | "Dropped Out" | "Completed" | "Graduated";

export type YearEnrollmentRecord = {
  id: string;
  academicYearId: string;
  name: string;
  rollNo: string;
  classLabel: string;
  section: string;
  classId: string;
  sectionId: string;
  status: YearRecordUiStatus;
  enrollmentStatus: EnrollmentStatus;
};

export type YearRecordsLoadState = {
  status: "demo" | "loading" | "ready" | "needs_institute" | "empty" | "forbidden" | "error";
  items: YearEnrollmentRecord[];
  errorMessage: string | null;
};

function toUiStatus(status: EnrollmentStatus): YearRecordUiStatus {
  switch (status) {
    case "active":
      return "Active";
    case "transferred":
      return "Transferred";
    case "dropped_out":
      return "Dropped Out";
    case "completed":
      return "Completed";
    case "graduated":
      return "Graduated";
    default:
      return "Active";
  }
}

export function yearRecordUiStatusTone(
  status: YearRecordUiStatus,
): "success" | "info" | "danger" | "neutral" | "warning" {
  if (status === "Active") return "success";
  if (status === "Transferred") return "info";
  if (status === "Dropped Out") return "danger";
  if (status === "Graduated") return "warning";
  return "neutral";
}

export async function loadYearEnrollmentRecords(
  instituteId: string | null,
  academicYearId: string | null,
): Promise<YearRecordsLoadState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }
  if (!instituteId || !isInstituteUuid(instituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }
  if (!academicYearId || !isInstituteUuid(academicYearId)) {
    return { status: "empty", items: [], errorMessage: null };
  }
  try {
    const [rows, catalog] = await Promise.all([
      listEnrollments({ instituteId, academicYearId }),
      listClassesCatalog({ instituteId }),
    ]);
    const classesById = new Map(
      catalog.classes
        .filter((c) => c.academicYearId === academicYearId)
        .map((c) => [c.id, c]),
    );
    const sectionsById = new Map(
      catalog.sections
        .filter((s) => s.academicYearId === academicYearId)
        .map((s) => [s.id, s]),
    );
    const items = enrollmentDtosToListItems(rows, { classesById, sectionsById }).map(
      (row): YearEnrollmentRecord => ({
        id: row.id,
        academicYearId: row.academicYearId,
        name: row.studentName,
        rollNo: row.rollNo,
        classLabel: row.classLabel,
        section: row.sectionLabel,
        classId: row.classId,
        sectionId: row.sectionId,
        status: toUiStatus(row.status),
        enrollmentStatus: row.status,
      }),
    );
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
    const message = err instanceof Error ? err.message : "Failed to load year records";
    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}

export type { EnrollmentListItem };
