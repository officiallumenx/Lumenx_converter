import type { StudentDetail } from "@/lib/teacher/types";
import type { StudentProfile, StudentSnapshot } from "@/lib/student/types";
import type { StudentDto, StudentGuardianDto } from "./types";

export function studentDisplayName(dto: StudentDto): string {
  return (
    dto.displayName?.trim() ||
    `${dto.firstName?.trim() ?? ""} ${dto.surname?.trim() ?? ""}`.trim() ||
    "Student"
  );
}

export function studentInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function studentDtoToTeacherDetail(
  dto: StudentDto,
  guardians: StudentGuardianDto[] = [],
): StudentDetail {
  const name = studentDisplayName(dto);
  const primary = guardians.find((g) => g.isPrimary) ?? guardians[0];
  return {
    id: dto.id,
    name,
    roll: dto.rollNo?.trim() || "—",
    classId: "",
    className: dto.classLabel?.trim() || "—",
    section: dto.sectionLabel?.trim() || "—",
    attendancePct: 0,
    homeworkSubmissionPct: 0,
    avgScore: 0,
    grade: dto.classLabel?.trim() || "—",
    avatarInitials: studentInitials(name),
    parentName: primary?.parentName ?? "—",
    parentPhone: primary?.phone?.trim() || "—",
    parentEmail: primary?.email?.trim() || undefined,
    marks: [],
    achievements: [],
    awards: [],
    certificates: [],
    remarks: [],
    pendingWork: [],
    attendanceSummary: {
      rate: 0,
      daysPresent: 0,
      daysAbsent: 0,
      recentAbsences: [],
    },
  };
}

export function studentDtoToProfile(
  dto: StudentDto,
  extras: { email?: string; institute?: string; parentName?: string } = {},
): StudentProfile {
  const name = studentDisplayName(dto);
  return {
    id: dto.id,
    name,
    class: dto.classLabel?.trim() || "—",
    section: dto.sectionLabel?.trim() || "—",
    rollNo: dto.rollNo?.trim() || "—",
    attendance: 0,
    bloodGroup: dto.bloodGroup?.trim() || "—",
    emergencyContact: dto.emergencyContact?.trim() || "—",
    parentName: extras.parentName?.trim() || "—",
    house: dto.house?.trim() || "—",
    idCardIssuedOn: dto.idCardIssuedOn?.slice(0, 10) ?? "—",
    idCardValidTill: dto.idCardValidTill?.slice(0, 10) ?? "—",
    email: extras.email?.trim() || "",
    bio: "",
    classTeacher: "",
    institute: extras.institute?.trim() || "Institute",
    address: dto.address?.trim() || "—",
  };
}

export function buildEmptyStudentSnapshot(profile: StudentProfile): StudentSnapshot {
  return {
    profile,
    reportCards: [],
    performance: [],
    trend: [],
    timetable: {},
    achievements: [],
    certificates: [],
    competitions: [],
    examHistory: [],
    academicTerms: [],
    attendanceSummary: {
      monthLabel: "",
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      attendancePct: 0,
      classAvgPct: 0,
      present: 0,
      absent: 0,
      leave: 0,
      workingDays: 0,
      monthDelta: 0,
    },
    attendanceDays: [],
    attendanceTrend: [],
    attendanceLog: [],
    notifications: [],
    exams: [],
    schoolEvents: [],
  };
}
