import {
  ACADEMIC_YEAR_RECORDS,
  type AcademicYearRecordStatus,
} from "@/lib/academic-management-data";
import type { EnrollmentListItem, EnrollmentStatus } from "./types";
import type { EnrollmentsListState } from "./load";

function demoStatusToApi(status: AcademicYearRecordStatus): EnrollmentStatus {
  if (status === "Active") return "active";
  if (status === "Transferred") return "transferred";
  return "dropped_out";
}

export function loadDemoEnrollmentsList(filters: {
  academicYearId?: string;
  status?: EnrollmentStatus | "all";
  sectionLabel?: string;
} = {}): EnrollmentsListState {
  let rows = ACADEMIC_YEAR_RECORDS.map(
    (record): EnrollmentListItem => ({
      id: record.id,
      studentId: record.id,
      studentName: record.name,
      classId: record.classLabel,
      sectionId: `${record.classLabel}-${record.section}`,
      academicYearId: record.academicYearId,
      classLabel: record.classLabel,
      sectionLabel: record.section,
      rollNo: record.rollNo,
      status: demoStatusToApi(record.status),
      enrolledOn: "2026-04-01",
      withdrawnOn: record.status === "Active" ? null : "2026-06-01",
    }),
  );

  if (filters.academicYearId) {
    rows = rows.filter((row) => row.academicYearId === filters.academicYearId);
  }
  if (filters.status && filters.status !== "all") {
    rows = rows.filter((row) => row.status === filters.status);
  }
  if (filters.sectionLabel && filters.sectionLabel !== "all") {
    rows = rows.filter((row) => row.sectionLabel === filters.sectionLabel);
  }

  return {
    status: rows.length === 0 ? "empty" : "demo",
    items: rows,
    errorMessage: null,
  };
}
