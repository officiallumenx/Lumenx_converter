import type { TeacherClass, TeacherStudent } from "@/lib/teacher/types";
import type {
  ClassDto,
  EnrollmentDto,
  SectionDto,
  SubjectDto,
  TeacherAssignmentDto,
} from "./api";

function classLabel(section: SectionDto, classesById: Map<string, ClassDto>): string {
  const cls = classesById.get(section.classId);
  return cls?.name?.trim() || cls?.code?.trim() || "Class";
}

function sectionLabel(section: SectionDto): string {
  return section.code?.trim() || section.name?.trim() || "—";
}

function subjectLabel(subjectId: string, subjectsById: Map<string, SubjectDto>): string {
  const subject = subjectsById.get(subjectId);
  return subject?.name?.trim() || subject?.code?.trim() || "Subject";
}

export function assignmentsToTeacherClasses(
  assignments: TeacherAssignmentDto[],
  sections: SectionDto[],
  classes: ClassDto[],
  enrollments: EnrollmentDto[],
  subjects: SubjectDto[],
): TeacherClass[] {
  const sectionsById = new Map(sections.map((s) => [s.id, s]));
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const enrollmentCountBySection = new Map<string, number>();
  for (const row of enrollments) {
    enrollmentCountBySection.set(
      row.sectionId,
      (enrollmentCountBySection.get(row.sectionId) ?? 0) + 1,
    );
  }

  const bySection = new Map<string, TeacherAssignmentDto[]>();
  for (const assignment of assignments) {
    if (assignment.status !== "active") continue;
    const bucket = bySection.get(assignment.sectionId) ?? [];
    bucket.push(assignment);
    bySection.set(assignment.sectionId, bucket);
  }

  const result: TeacherClass[] = [];
  for (const [sectionId, sectionAssignments] of bySection) {
    const section = sectionsById.get(sectionId);
    if (!section) continue;
    const subjectsForSection = [
      ...new Set(sectionAssignments.map((a) => subjectLabel(a.subjectId, subjectsById))),
    ];
    result.push({
      id: sectionId,
      className: classLabel(section, classesById),
      section: sectionLabel(section),
      subject: subjectsForSection.join(", "),
      studentCount: enrollmentCountBySection.get(sectionId) ?? 0,
      isClassTeacher: false,
      attendanceRate: 0,
      homeworkSubmissionRate: 0,
      avgScore: 0,
    });
  }

  return result.sort((a, b) =>
    `${a.className}-${a.section}`.localeCompare(`${b.className}-${b.section}`),
  );
}

export function enrollmentsToTeacherStudents(
  enrollments: EnrollmentDto[],
  sections: SectionDto[],
  classes: ClassDto[],
): TeacherStudent[] {
  const sectionsById = new Map(sections.map((s) => [s.id, s]));
  const classesById = new Map(classes.map((c) => [c.id, c]));

  return enrollments.map((row) => {
    const section = sectionsById.get(row.sectionId);
    const cls = section ? classesById.get(section.classId) : undefined;
    const className = cls?.name?.trim() || cls?.code?.trim() || "Class";
    const sectionCode = section ? sectionLabel(section) : "—";
    const initials = row.studentName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
    return {
      id: row.studentId,
      name: row.studentName,
      roll: row.rollNo,
      classId: row.sectionId,
      className,
      section: sectionCode,
      attendancePct: 0,
      homeworkSubmissionPct: 0,
      avgScore: 0,
      grade: className,
      avatarInitials: initials || "?",
    };
  });
}
