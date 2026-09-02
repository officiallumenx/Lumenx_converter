import { getInitials } from "@lumenx/utils";
import type {
  DashboardSnapshot,
  TeacherClass,
  TeacherProfile,
  TimetableSlot,
} from "@/lib/teacher/types";
import type {
  LearnerTeacherCard,
  PortalLearnerFacultyDto,
  PortalLearnerFacultyMemberDto,
  PortalTeacherSelfDto,
} from "./types";
import type { WeeklyTimetable } from "@/lib/timetable/types";

export function facultyMemberToCard(member: PortalLearnerFacultyMemberDto): LearnerTeacherCard {
  const subjects = member.subjects.filter(Boolean);
  return {
    id: member.id,
    name: member.displayName,
    subject: subjects.length > 0 ? subjects.join(", ") : member.department,
    isClassTeacher: member.isClassTeacher,
    phone: member.phone?.trim() || "—",
    initials: getInitials(member.displayName, 2),
    email: member.email?.trim() || undefined,
    qualification: member.qualification?.trim() || undefined,
    department: member.department,
  };
}

export function facultyDtoToCards(dto: PortalLearnerFacultyDto): LearnerTeacherCard[] {
  return dto.teachers.map(facultyMemberToCard);
}

export function portalTeacherSelfToProfile(dto: PortalTeacherSelfDto): TeacherProfile {
  const classLabels = dto.assignments.map(
    (assignment) => `${assignment.classLabel}-${assignment.sectionLabel}`,
  );
  const subjects = [
    ...new Set([
      ...(dto.subjects ?? []).map((subject) => subject.trim()).filter(Boolean),
      ...dto.assignments.flatMap((assignment) => assignment.subjects),
    ]),
  ];

  return {
    id: dto.teacherId,
    name: dto.displayName,
    employeeId: dto.employeeId?.trim() || dto.legacyCode?.trim() || dto.teacherId.slice(0, 8),
    email: dto.email?.trim() || "—",
    phone: dto.phone?.trim() || "—",
    subjects,
    classes: classLabels,
    experienceYears: 0,
    department: dto.department,
    joinedOn: dto.joinedOn ?? "—",
    bio: dto.qualification?.trim() || undefined,
  };
}

export function buildTeacherDashboardFromApi(input: {
  schedule: WeeklyTimetable;
  todayName: string;
  classes: TeacherClass[];
}): DashboardSnapshot {
  const dayPeriods = input.schedule[input.todayName] ?? [];
  const todayClasses: TimetableSlot[] = dayPeriods.map((period, index) => ({
    id: `today-${index}-${period.time}`,
    day: input.todayName,
    time: period.time,
    subject: period.subject,
    className: "—",
    section: "—",
  }));
  const weekClassCount = Object.values(input.schedule).reduce(
    (total, periods) => total + periods.length,
    0,
  );

  return {
    todayClasses,
    weekClassCount,
    attendancePending: [],
    attendanceCompleted: [],
    classesRemaining: 0,
    pendingMarks: [],
    pendingHomework: [],
    homeworkOverview: [],
    upcomingExams: [],
    upcomingEvents: [],
    unreadMessages: 0,
    recentComplaints: [],
    classPerformance: input.classes.map((teacherClass) => ({
      classId: teacherClass.id,
      label: `${teacherClass.className}-${teacherClass.section}`,
      attendance: 0,
      homework: 0,
      avgScore: 0,
    })),
    recentNotifications: [],
    announcements: [],
    studentsNeedingAttention: [],
  };
}
