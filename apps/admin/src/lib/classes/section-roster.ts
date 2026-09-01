import type { EnrollmentDto } from "@/lib/enrollments/types";
import { createEnrollment, listEnrollments } from "@/lib/enrollments/api";
import { listStudents } from "@/lib/students/api";
import type { SectionDetailItem } from "@/lib/classes/types";

export type SectionRosterRow = {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  status: EnrollmentDto["status"];
  enrolledOn: string;
};

export async function loadSectionRoster(
  section: Pick<SectionDetailItem, "id" | "instituteId" | "academicYearId" | "classId">,
): Promise<SectionRosterRow[]> {
  const rows = await listEnrollments({
    instituteId: section.instituteId,
    sectionId: section.id,
    status: "active",
  });
  return rows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.studentName,
    rollNo: r.rollNo,
    status: r.status,
    enrolledOn: r.enrolledOn,
  }));
}

export async function enrollStudentInSection(input: {
  section: Pick<
    SectionDetailItem,
    "id" | "instituteId" | "academicYearId" | "classId"
  >;
  studentId: string;
  rollNo: string;
}): Promise<EnrollmentDto> {
  return createEnrollment({
    instituteId: input.section.instituteId,
    academicYearId: input.section.academicYearId,
    studentId: input.studentId,
    classId: input.section.classId,
    sectionId: input.section.id,
    rollNo: input.rollNo.trim(),
    enrolledOn: new Date().toISOString().slice(0, 10),
    status: "active",
  });
}

export async function listStudentsForEnrollPicker(instituteId: string) {
  const students = await listStudents({ instituteId });
  return students
    .filter((s) => s.status === "active")
    .map((s) => ({
      id: s.id,
      label: `${s.displayName}${s.rollNo ? ` · Roll ${s.rollNo}` : ""}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
